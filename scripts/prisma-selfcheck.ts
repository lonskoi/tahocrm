import 'dotenv/config'
import { prismaTenant } from '../lib/prisma'

async function main() {
  const tenantId = process.env.TENANT_ID ?? 'tenant-1'
  const prisma = prismaTenant(tenantId)

  try {
    await prisma.customer.findMany({ take: 1 })
    console.log('OK customer.findMany')

    await prisma.vehicle.findMany({
      take: 1,
      include: { customer: true, tachographs: true },
    })
    console.log('OK vehicle.findMany include customer/tachographs')

    await prisma.invoice.findMany({
      take: 1,
      include: { customer: true, order: true, issuerOrganization: true, items: true },
    })
    console.log('OK invoice.findMany include customer/order/issuerOrganization/items')

    await prisma.document.findMany({ take: 1 })
    console.log('OK document.findMany')

    await prisma.tenantUiConfig.findMany({ take: 1 })
    console.log('OK tenantUiConfig.findMany')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error('SELF_CHECK_FAILED', err)
  process.exit(1)
})
