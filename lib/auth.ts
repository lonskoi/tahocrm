import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prismaMaster, prismaTenant } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        const startedAt = Date.now()
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('auth.credentials.authorize: missing email/password', {
              tenantId: (credentials as { tenantId?: unknown })?.tenantId,
              durationMs: Date.now() - startedAt,
            })
            return null
          }

          const email = credentials.email as string
          const password = credentials.password as string
          const tenantId = (credentials.tenantId as string | undefined) ?? undefined

          // ---- DB-backed auth ----
          // Tenant-scoped login: /crm/<tenantId>/login
          if (tenantId) {
            const prisma = prismaTenant(tenantId)
            const user = await prisma.user.findUnique({ where: { email } })
            if (!user) {
              logger.warn('auth.credentials.authorize: tenant user not found', {
                tenantId,
                email,
                durationMs: Date.now() - startedAt,
              })
              return null
            }
            if (!user.isActive) {
              logger.warn('auth.credentials.authorize: tenant user inactive', {
                tenantId,
                email,
                userId: user.id,
                durationMs: Date.now() - startedAt,
              })
              return null
            }
            if (user && user.isActive) {
              const ok = await bcrypt.compare(password, user.password)
              if (!ok) {
                logger.warn('auth.credentials.authorize: tenant password mismatch', {
                  tenantId,
                  email,
                  userId: user.id,
                  durationMs: Date.now() - startedAt,
                })
                return null
              }

              // best-effort lastLogin
              await prisma.user
                .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
                .catch(() => {})

              logger.info('auth.credentials.authorize: tenant ok', {
                tenantId,
                email,
                userId: user.id,
                role: user.role,
                durationMs: Date.now() - startedAt,
              })

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                roles: (user as unknown as { roles?: UserRole[] | null }).roles ?? [],
                tenantId: user.tenantId,
              }
            }

            // Dev convenience: if tenant DB is empty, allow demo accounts by provisioning them in tenant DB.
            if (process.env.NODE_ENV !== 'production') {
              const isTenantAdminDemo =
                email === 'tenant-admin@test.com' &&
                (password === 'admin' || password === 'admin123')
              const isManagerDemo =
                email === 'manager@test.com' &&
                (password === 'manager' || password === 'manager123')

              if (isTenantAdminDemo || isManagerDemo) {
                const role: UserRole = isTenantAdminDemo ? 'TENANT_ADMIN' : 'MANAGER'
                const name = isTenantAdminDemo ? 'Админ мастерской' : 'Менеджер'
                const hashedPassword = await bcrypt.hash(password, 10)

                const created = await prisma.user.create({
                  data: {
                    email,
                    password: hashedPassword,
                    name,
                    role,
                    tenantId,
                    isActive: true,
                    lastLogin: new Date(),
                  },
                })

                return {
                  id: created.id,
                  email: created.email,
                  name: created.name,
                  role: created.role,
                  roles: [],
                  tenantId: created.tenantId,
                }
              }
            }

            return null
          }

          // ---- Fast demo fallback (kept for local UX) ----
          // Platform demo (master DB)
          if (email === 'admin@test.com' && (password === 'admin' || password === 'admin123')) {
            return {
              id: '1',
              email: 'admin@test.com',
              name: 'Администратор',
              role: 'SUPER_ADMIN',
              roles: [],
              tenantId: null,
            }
          }

          // Platform login: /platform/login (master DB)
          const user = await prismaMaster.user.findUnique({ where: { email } })
          if (!user) {
            logger.warn('auth.credentials.authorize: platform user not found', {
              email,
              durationMs: Date.now() - startedAt,
            })
            return null
          }
          if (!user.isActive) {
            logger.warn('auth.credentials.authorize: platform user inactive', {
              email,
              userId: user.id,
              durationMs: Date.now() - startedAt,
            })
            return null
          }
          const ok = await bcrypt.compare(password, user.password)
          if (!ok) {
            logger.warn('auth.credentials.authorize: platform password mismatch', {
              email,
              userId: user.id,
              durationMs: Date.now() - startedAt,
            })
            return null
          }

          await prismaMaster.user
            .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
            .catch(() => {})

          logger.info('auth.credentials.authorize: platform ok', {
            email,
            userId: user.id,
            role: user.role,
            durationMs: Date.now() - startedAt,
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            roles: (user as unknown as { roles?: UserRole[] | null }).roles ?? [],
            tenantId: user.tenantId,
          }
        } catch (error) {
          logger.error('auth.credentials.authorize: exception', {
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          })
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
        token.roles = (user as unknown as { roles?: UserRole[] | null }).roles ?? []
        token.tenantId = (user as { tenantId: string | null }).tenantId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.roles = (token as unknown as { roles?: UserRole[] | null }).roles ?? []
        session.user.tenantId = token.tenantId as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/crm/login',
    error: '/api/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key-change-in-production',
  debug: false,
}
