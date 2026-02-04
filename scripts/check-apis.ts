#!/usr/bin/env tsx
/**
 * Скрипт для проверки всех API endpoints
 */

const baseUrl = 'http://localhost:3000'

const endpoints = [
  { path: '/api/health', method: 'GET', auth: false },
  { path: '/api/search?q=test', method: 'GET', auth: false },
  { path: '/api/orders', method: 'GET', auth: true },
  { path: '/api/customers', method: 'GET', auth: true },
  { path: '/api/vehicles', method: 'GET', auth: true },
  { path: '/api/equipment', method: 'GET', auth: true },
  { path: '/api/products', method: 'GET', auth: true },
  { path: '/api/services', method: 'GET', auth: true },
  { path: '/api/invoices', method: 'GET', auth: true },
  { path: '/api/documents', method: 'GET', auth: true },
  { path: '/api/tasks', method: 'GET', auth: true },
  { path: '/api/users', method: 'GET', auth: true },
  { path: '/api/audit?entityType=customer&entityId=test', method: 'GET', auth: true },
]

async function checkEndpoint(endpoint: (typeof endpoints)[0]) {
  try {
    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      method: endpoint.method,
    })

    const status = response.status
    const statusText = status === 200 || status === 201 ? '✅' : status === 401 ? '🔒' : '❌'

    return {
      path: endpoint.path,
      status,
      statusText,
      ok: response.ok || status === 401, // 401 ожидаем для endpoints требующих auth
    }
  } catch (error) {
    return {
      path: endpoint.path,
      status: 0,
      statusText: '❌',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('🔍 Checking API endpoints...\n')
  console.log('Waiting for server to start...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  const results = await Promise.all(endpoints.map(checkEndpoint))

  console.log('\nResults:')
  results.forEach(result => {
    const status = result.statusText
    const path = result.path.padEnd(50)
    const statusCode = result.status || 'ERROR'
    const error = result.error ? ` - ${result.error}` : ''
    console.log(`${status} ${path} ${statusCode}${error}`)
  })

  const successCount = results.filter(r => r.ok).length
  const totalCount = results.length
  console.log(`\n✅ ${successCount}/${totalCount} endpoints accessible`)
}

main().catch(console.error)
