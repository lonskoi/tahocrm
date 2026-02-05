import type { UserRole } from '@prisma/client'

type UserLike = {
  role?: UserRole | null
  roles?: UserRole[] | null
}

export function effectiveRoles(user: UserLike | null | undefined): UserRole[] {
  if (!user?.role) return []
  const extra = Array.isArray(user.roles) ? user.roles : []
  // `roles` stores additional roles; `role` is primary.
  // Backward-compatible: if roles isn't present, we still return [role].
  const all = [user.role, ...extra].filter(Boolean) as UserRole[]
  return Array.from(new Set(all))
}

export function hasRole(user: UserLike | null | undefined, role: UserRole): boolean {
  return effectiveRoles(user).includes(role)
}

export function hasAnyRole(
  user: UserLike | null | undefined,
  allowed: Iterable<UserRole>
): boolean {
  const allowedSet = new Set(allowed)
  for (const r of effectiveRoles(user)) {
    if (allowedSet.has(r)) return true
  }
  return false
}
