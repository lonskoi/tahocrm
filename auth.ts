import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Centralized NextAuth v5 exports
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
