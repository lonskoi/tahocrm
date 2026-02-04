import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import type { VatRate } from '@prisma/client'
import ExcelJS from 'exceljs'
import { readFile } from 'fs/promises'
import path from 'path'
import os from 'os'
import { mkdtemp, rm, writeFile, readFile as readFileFs } from 'fs/promises'
import { spawn } from 'child_process'

// Ensure Node.js runtime (ExcelJS + child_process)
export const runtime = 'nodejs'

const READ_ROLES = new Set(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER', 'CARD_SPECIALIST'])

function vatRateToNumber(rate: VatRate): number {
  if (rate === 'VAT_5') return 0.05
  if (rate === 'VAT_7') return 0.07
  if (rate === 'VAT_10') return 0.1
  if (rate === 'VAT_20') return 0.2
  if (rate === 'VAT_22') return 0.22
  return 0
}

function formatMoney(n: number): number {
  // Keep numeric (template typically has number formats)
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function innKpp(inn?: string | null, kpp?: string | null): string {
  const i = inn ?? ''
  const k = kpp ?? ''
  if (!i && !k) return ''
  if (i && k) return `${i} / ${k}`
  return i || k
}

function formatRuDateLong(d: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

type PositionCtx = {
  name: string
  quantity: number
  unit: string | null
  sku: string | null
  vatRate: VatRate
  priceGross: number // unit price (with VAT)
}

type UpdCtx = {
  invoiceNumber: string
  invoiceDate: Date
  orderNumber: string | null
  orderDate: Date | null
  currencyCode: string
  currencyDescription: string
  issuer: {
    name: string
    legalTitle: string
    inn: string | null
    kpp: string | null
    address: string | null
    legalAddress: string | null
    director: string | null
    chiefAccountant: string | null
    payerVat: boolean
  }
  customer: {
    name: string
    legalTitle: string
    inn: string | null
    kpp: string | null
    address: string | null
    legalAddress: string | null
  }
  positions: PositionCtx[]
}

function isMergedChildCell(cell: ExcelJS.Cell): boolean {
  // Excel stores the value only in the master cell of a merged range.
  // When iterating with includeEmpty=true, ExcelJS also gives us "child" cells.
  // Writing into those causes visible duplication/artefacts inside merged blocks.
  const anyCell = cell as any
  if (!anyCell?.isMerged) return false
  const master: ExcelJS.Cell | undefined = anyCell.master
  if (!master) return false
  return !!master.address && master.address !== cell.address
}

function resolvePlaceholder(
  full: string,
  ctx: UpdCtx,
  position?: PositionCtx
): ExcelJS.CellValue | null {
  // --- Simple invoice/order values ---
  if (full === '${o.name}') return ctx.invoiceNumber
  if (full === '${formatter.getDemandsDocumentNumber(o)}') return ctx.orderNumber ?? ''
  if (full === '${formatter.getDemandsDocumentDate(o)}')
    return ctx.orderDate ? formatRuDateLong(ctx.orderDate) : ''
  if (full === '${formatter.getCurrency(o).code}') return ctx.currencyCode
  if (full === '${formatter.getCurrency(o).description}') return ctx.currencyDescription
  if (full === '${formatter.getUpdStatus(o)}') return '1'

  // Invoice date (o.moment)
  if (full.startsWith('${formatter.format("%1$td %1$tB %1$tY"')) {
    return formatRuDateLong(ctx.invoiceDate)
  }
  if (full.startsWith('${formatter.format("№')) {
    // Some templates prefix with №; preserve
    return `№ ${formatRuDateLong(ctx.invoiceDate)}`
  }

  // --- INN/KPP and addresses from requisites (template expressions) ---
  if (full.includes('o.sourceAgentRequisite.INN') && full.includes('o.sourceAgentRequisite.KPP')) {
    return innKpp(ctx.issuer.inn, ctx.issuer.kpp)
  }
  if (full.includes('o.targetAgentRequisite.INN') && full.includes('o.targetAgentRequisite.KPP')) {
    return innKpp(ctx.customer.inn, ctx.customer.kpp)
  }
  if (full.includes('o.sourceAgentRequisite.legalAddress')) {
    return ctx.issuer.legalAddress ?? ctx.issuer.address ?? ''
  }
  if (full.includes('o.targetAgentRequisite.legalAddress')) {
    return ctx.customer.legalAddress ?? ctx.customer.address ?? ''
  }

  if (
    full ===
    '${formatter.printIfElse(empty(o.sourceAgentRequisite.legalTitle), o.sourceAgentRequisite.agent.name, o.sourceAgentRequisite.legalTitle)}'
  ) {
    return ctx.issuer.legalTitle || ctx.issuer.name
  }
  if (
    full ===
    '${formatter.printIfElse(empty(o.targetAgentRequisite.legalTitle), o.targetAgentRequisite.agent.name, o.targetAgentRequisite.legalTitle)}'
  ) {
    return ctx.customer.legalTitle || ctx.customer.name
  }

  // Directors/accountant from issuer
  if (full.includes('o.sourceAgent.director')) return ctx.issuer.director ?? ''
  if (full.includes('o.sourceAgent.chiefAccountant')) return ctx.issuer.chiefAccountant ?? ''

  // --- Row / formatting helpers (we don't execute side effects; we just remove them) ---
  if (full.startsWith('${formatter.adjustRowHeight')) return ''
  if (full.startsWith('${formatter.mergeByTraceable')) return ''
  if (full.startsWith('${formatter.sumByColumn')) return ''
  if (full.startsWith('${formatter.tableDivisionByPage')) return ''
  if (full.startsWith('${formatter.formatRelatedPaymentsToString')) return ''
  if (full.startsWith('${o.positions}')) return ''
  if (full.startsWith('${o.contract')) return ''
  if (full.startsWith('${o.idStateContract')) return ''

  // --- Position (row 21) ---
  if (!position) {
    // If placeholder is position-bound but we have no position context, leave it for later pass.
    if (full.includes('position.')) return null
    return null
  }

  if (full === '${position.printName}') return position.name
  if (full === '${position.quantity}') return formatMoney(position.quantity)
  if (full === '${position.good.uom.code}') return position.unit ?? ''
  if (full === '${position.good.uom.name}') return position.unit ?? ''

  if (
    full ===
    '${formatter.printIfElse(empty(position.good.code), "----", position.consignment.feature.effectiveCode)}'
  ) {
    return position.sku ?? '----'
  }

  // Price per unit without VAT (template expects number)
  if (
    full ===
    '${formatter.printIfElse(o.sourceAgentRequisite.agent.payerVat  || o.hasReturns(), (position.price.sumInCurrency /(100+ position.vat) ),(position.price.sumInCurrency / 100))}'
  ) {
    const r = vatRateToNumber(position.vatRate)
    if (r <= 0) return formatMoney(position.priceGross)
    return formatMoney(position.priceGross / (1 + r))
  }

  if (full === '${formatter.getPositionCostWithoutVatForUpd(position)}') {
    const r = vatRateToNumber(position.vatRate)
    const gross = position.priceGross * position.quantity
    const vat = r > 0 ? (gross * r) / (1 + r) : 0
    return formatMoney(gross - vat)
  }
  if (full === '${formatter.getPositionSumVatForUpd(position)}') {
    const r = vatRateToNumber(position.vatRate)
    const gross = position.priceGross * position.quantity
    const vat = r > 0 ? (gross * r) / (1 + r) : 0
    return formatMoney(vat)
  }
  if (full === '${formatter.getPositionCostWithVatForUpd(position)}') {
    const gross = position.priceGross * position.quantity
    return formatMoney(gross)
  }

  // VAT label cell (template contains Russian text "Без НДС"; avoid brittle full-string equality)
  if (
    full.includes('position.nullableVat') &&
    full.includes('payerVat') &&
    (full.includes('Без НДС') || full.includes('Bez NDS'))
  ) {
    const r = vatRateToNumber(position.vatRate)
    if (!ctx.issuer.payerVat || r <= 0) return 'Без НДС'
    return `${Math.round(r * 100)}%`
  }

  // Country / traceability fields: not present in our CRM -> keep placeholders output as template fallback
  if (full.includes('position.country.code')) return '-'
  if (full.includes('position.country.name')) return '----'
  if (full.startsWith('${formatter.printTraceableIfElse')) return '----'

  return null
}

function renderString(
  input: string,
  ctx: UpdCtx,
  position?: PositionCtx
): ExcelJS.CellValue | null {
  const pattern = /\$\{[\s\S]*?\}/g
  const matches = input.match(pattern)
  if (!matches) return input

  let out = input
  for (const full of matches) {
    const resolved = resolvePlaceholder(full, ctx, position)
    if (resolved === null) continue
    // If cell is exactly a placeholder and we got a number, return number
    if (input.trim() === full && typeof resolved === 'number') return resolved
    out = out.split(full).join(String(resolved))
  }

  // If we still have unresolved placeholders, keep them (they'll be handled later or cleared)
  return out
}

async function convertXlsxBufferToPdf(xlsx: Buffer): Promise<Buffer> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'tahocrm-upd-'))
  const inputPath = path.join(tmpDir, 'doc.xlsx')
  await writeFile(inputPath, xlsx)

  try {
    const sofficeCmd =
      process.platform === 'win32'
        ? process.env.SOFFICE_PATH || 'C:\\\\Program Files\\\\LibreOffice\\\\program\\\\soffice.com'
        : process.env.SOFFICE_PATH || 'soffice'

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        sofficeCmd,
        [
          '--headless',
          '--nologo',
          '--nofirststartwizard',
          '--convert-to',
          'pdf',
          '--outdir',
          tmpDir,
          inputPath,
        ],
        { stdio: 'ignore' }
      )
      proc.on('error', reject)
      proc.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`soffice convert failed (code ${code})`))
      })
    })

    const pdfPath = path.join(tmpDir, 'doc.pdf')
    const pdf = await readFileFs(pdfPath)
    return pdf
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function GET(request: NextRequest) {
  const pathName = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    if (!READ_ROLES.has(session.user.role)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const invoiceId = request.nextUrl.searchParams.get('invoiceId')
    const format = (request.nextUrl.searchParams.get('format') ?? 'xlsx').toLowerCase()
    if (!invoiceId) throw new ApiError(400, 'invoiceId is required', 'VALIDATION_ERROR')
    if (format !== 'xlsx' && format !== 'pdf')
      throw new ApiError(400, 'Invalid format', 'VALIDATION_ERROR')

    const prisma = prismaTenant(tenantId)
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        customer: true,
        issuerOrganization: true,
        order: true,
      },
    })
    if (!invoice) throw new ApiError(404, 'Invoice not found', 'NOT_FOUND')

    const productIds = Array.from(
      new Set(invoice.items.map(i => i.productId).filter(Boolean))
    ) as string[]
    const serviceIds = Array.from(
      new Set(invoice.items.map(i => i.serviceId).filter(Boolean))
    ) as string[]
    const [products, services] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({
            where: { tenantId, id: { in: productIds } },
            select: { id: true, sku: true },
          })
        : Promise.resolve([]),
      serviceIds.length
        ? prisma.service.findMany({
            where: { tenantId, id: { in: serviceIds } },
            select: { id: true, sku: true },
          })
        : Promise.resolve([]),
    ])
    const skuByProductId = new Map(products.map(p => [p.id, p.sku]))
    const skuByServiceId = new Map(services.map(s => [s.id, s.sku]))

    const issuer = invoice.issuerOrganization
    const customer = invoice.customer

    const ctx: UpdCtx = {
      invoiceNumber: invoice.number,
      invoiceDate: invoice.issueDate,
      orderNumber: invoice.order?.number ?? null,
      orderDate: invoice.order?.createdAt ?? null,
      currencyCode: 'RUB',
      currencyDescription: 'Российский рубль',
      issuer: {
        name: issuer?.name ?? '',
        legalTitle: issuer?.name ?? '',
        inn: issuer?.inn ?? null,
        kpp: issuer?.kpp ?? null,
        address: issuer?.address ?? null,
        legalAddress: issuer?.address ?? null,
        director: null,
        chiefAccountant: null,
        payerVat: true,
      },
      customer: {
        name: customer?.name ?? '',
        legalTitle: customer?.fullName ?? customer?.name ?? '',
        inn: customer?.inn ?? null,
        kpp: customer?.kpp ?? null,
        address: customer?.address ?? null,
        legalAddress: customer?.legalAddress ?? customer?.address ?? null,
      },
      positions: invoice.items.map(it => ({
        name: it.name,
        quantity: Number(it.quantity),
        unit: it.unit ?? null,
        sku: it.productId
          ? (skuByProductId.get(it.productId) ?? null)
          : it.serviceId
            ? (skuByServiceId.get(it.serviceId) ?? null)
            : null,
        vatRate: it.vatRate as VatRate,
        priceGross: Number(it.price),
      })),
    }

    const templatePath = path.join(process.cwd(), 'templates', 'forms-samples', 'upd_new.xlsx')
    const template = Buffer.from(await readFile(templatePath))
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(template as any)
    const ws = wb.worksheets[0]
    if (!ws) throw new ApiError(500, 'Template sheet not found', 'TEMPLATE_ERROR')

    // 1) First pass: render non-position placeholders in whole sheet
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: true }, cell => {
        if (isMergedChildCell(cell)) return
        if (typeof cell.value === 'string' && cell.value.includes('${')) {
          const rendered = renderString(cell.value, ctx)
          if (rendered !== null) cell.value = rendered
        }
      })
    })

    // 2) Expand and fill positions (row 21 is the template row in MoySklad UPD)
    const templateRowNum = 21
    const positions = ctx.positions

    // ExcelJS has built-in row duplication that preserves most styles/heights better than manual copy.
    // This significantly improves pixel-perfect templates vs MoySklad.
    if (positions.length > 1) {
      ws.duplicateRow(templateRowNum, positions.length - 1, true)
    }

    for (let i = 0; i < positions.length; i++) {
      const rowNum = templateRowNum + i
      const row = ws.getRow(rowNum)
      row.eachCell({ includeEmpty: true }, cell => {
        if (isMergedChildCell(cell)) return
        if (typeof cell.value === 'string' && cell.value.includes('${')) {
          const rendered = renderString(cell.value, ctx, positions[i])
          if (rendered !== null) cell.value = rendered
        }
      })
    }

    // 3) Final cleanup: remove any remaining placeholders (better blank than leaking expressions)
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: true }, cell => {
        if (isMergedChildCell(cell)) return
        if (typeof cell.value === 'string' && cell.value.includes('${')) {
          cell.value = ''
        }
      })
    })

    const raw = await wb.xlsx.writeBuffer()
    const xlsxBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer)

    // Audit-only (no file stored): record that invoice doc was generated
    await prisma.auditLog
      .create({
        data: {
          tenantId,
          userId: session.user.id,
          action: 'VIEW',
          entityType: 'invoice',
          entityId: invoice.id,
          changes: { template: 'upd_new', format, invoiceId: invoice.id } as any,
        },
      })
      .catch(() => {})

    if (format === 'xlsx') {
      const fileName = `UPD_${invoice.number}.xlsx`
      return new NextResponse(new Uint8Array(xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // pdf
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await convertXlsxBufferToPdf(xlsxBuffer)
    } catch (e) {
      throw new ApiError(
        501,
        'PDF generation is not available on this server (LibreOffice soffice is required).',
        'PDF_NOT_AVAILABLE'
      )
    }

    const pdfName = `UPD_${invoice.number}.pdf`
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(pdfName)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return handleApiError(error, {
      method: 'GET',
      path: pathName,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}
