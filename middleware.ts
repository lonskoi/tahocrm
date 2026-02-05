import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

async function resolveAuthToken(request: NextRequest) {
  // NextAuth/Auth.js v5 uses `authjs.*` cookies (and `__Secure-` prefix on HTTPS).
  // `getToken` defaults are v4-ish, and behind a reverse proxy Next.js may see the request
  // as http even if the browser uses https. To be robust, try common cookie names.
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'development-secret-key-change-in-production'

  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    // legacy fallback (just in case)
    '__Secure-next-auth.session-token',
    'next-auth.session-token',
  ] as const

  for (const cookieName of cookieNames) {
    const token = await getToken({ req: request, secret, cookieName })
    if (token) return token
  }
  return null
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const segments = path.split('/').filter(Boolean)
  const legacyCrmRoots = new Set([
    'manager',
    'master',
    'card-specialist',
    'director',
    'client',
    'orders',
    'tasks',
  ])

  // Public routes & assets
  if (
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/crm/login' ||
    path.startsWith('/crm/login/') ||
    path === '/platform/login' ||
    path.startsWith('/platform/login/') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Public tenant-scoped CRM login: /crm/<tenantId>/login
  if (segments[0] === 'crm' && segments[2] === 'login') {
    return NextResponse.next()
  }

  // Only protect platform/crm areas (dashboard is legacy and may be removed later)
  const isPlatform = path === '/platform' || path.startsWith('/platform/')
  const isCrm = path === '/crm' || path.startsWith('/crm/')
  if (!isPlatform && !isCrm) return NextResponse.next()

  try {
    const token = await resolveAuthToken(request)

    if (!token) {
      if (
        segments[0] === 'crm' &&
        segments.length >= 2 &&
        segments[1] &&
        segments[1] !== 'login' &&
        !legacyCrmRoots.has(segments[1])
      ) {
        // If path looks like /crm/<tenantId>/..., send to tenant login
        const maybeTenantId = segments[1]
        return NextResponse.redirect(new URL(`/crm/${maybeTenantId}/login`, request.url))
      }
      return NextResponse.redirect(
        new URL(isPlatform ? '/platform/login' : '/crm/login', request.url)
      )
    }

    const role = (token as { role?: string }).role
    const tenantId = (token as { tenantId?: string | null }).tenantId

    if (isPlatform) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/platform/login', request.url))
      }
      return NextResponse.next()
    }

    // CRM
    if (role === 'SUPER_ADMIN' || !tenantId) {
      return NextResponse.redirect(new URL('/crm/login', request.url))
    }

    // Legacy CRM routes (without tenantId segment)
    if (segments[0] === 'crm' && segments[1] && legacyCrmRoots.has(segments[1])) {
      return NextResponse.next()
    }

    // Tenant-scoped CRM routes: /crm/<tenantId>/...
    if (segments[0] === 'crm' && segments[1] && segments[1] !== 'login') {
      const pathTenantId = segments[1]
      if (tenantId !== pathTenantId) {
        return NextResponse.redirect(new URL(`/crm/${tenantId}`, request.url))
      }
      return NextResponse.next()
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(
      new URL(isPlatform ? '/platform/login' : '/crm/login', request.url)
    )
  }
}

export const config = {
  matcher: ['/platform/:path*', '/crm/:path*'],
}
