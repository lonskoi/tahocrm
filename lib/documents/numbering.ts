export type DocumentSequenceType = 'ORDER' | 'INVOICE' | 'UPD'

type TxLike = {
  documentNumberSequence: {
    findUnique: (args: any) => Promise<any>
    create: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
  }
}

/**
 * Allocate the next document number for a tenant & doc type.
 *
 * - Starts from 0
 * - Resets yearly (based on `now.getFullYear()`)
 * - Must be called inside a transaction for best consistency
 */
export async function nextDocumentNumber(
  tx: TxLike,
  tenantId: string,
  docType: DocumentSequenceType,
  now: Date = new Date()
): Promise<string> {
  const currentYear = now.getFullYear()

  const where = { tenantId_docType: { tenantId, docType } }
  const existing = await tx.documentNumberSequence.findUnique({ where })

  if (!existing) {
    // allocate 1
    await tx.documentNumberSequence.create({
      data: { tenantId, docType, resetYear: currentYear, nextNumber: 2 } as any,
    })
    return '1'
  }

  if (existing.resetYear !== currentYear) {
    // reset and allocate 1
    await tx.documentNumberSequence.update({
      where,
      data: { resetYear: currentYear, nextNumber: 2 },
    })
    return '1'
  }

  const allocated =
    typeof existing.nextNumber === 'number' ? existing.nextNumber : Number(existing.nextNumber ?? 0)
  await tx.documentNumberSequence.update({
    where,
    data: { nextNumber: allocated + 1 },
  })
  return String(allocated)
}
