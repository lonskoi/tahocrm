import { NextResponse } from 'next/server'
import { prismaMaster } from '@/lib/prisma'

export async function GET() {
  try {
    // Проверка доступности БД через Prisma
    await prismaMaster.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, db: 'ok' }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
