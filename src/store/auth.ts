import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types'
import { hasPermission as checkPermission } from '../utils/permissions'

type AuthState = {
  user?: AuthUser
  setUser: (user: AuthUser) => void
  logout: () => void
  hasPermission: (permission?: string) => boolean
  hasPlanFeature: (feature?: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get): AuthState => ({
      user: undefined,
      setUser: (user) => set({ user }),
      logout: () => set({ user: undefined }),
      hasPermission: (permission?: string) => {
        const user = get().user
        return checkPermission(user?.permissions, user?.roles, permission)
      },
      hasPlanFeature: (feature?: string) => {
        if (!feature) return true
        const user = get().user
        const isTenantAdmin = user?.roles?.includes('ROLE_TENANT_ADMIN') || user?.roles?.includes('TENANT_ADMIN')
        return Boolean(isTenantAdmin || user?.planFeatures?.includes('*') || user?.planFeatures?.includes(feature))
      },
    }),
    { name: 'flexchain-web-auth-v2' },
  ),
)
