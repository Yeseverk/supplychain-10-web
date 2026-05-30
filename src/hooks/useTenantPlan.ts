import { useAuthStore } from '../store/auth'

export function useTenantPlan() {
  const user = useAuthStore((state) => state.user)

  const supported = (feature?: string) => {
    if (!feature) return true
    const isTenantAdmin = user?.roles?.includes('ROLE_TENANT_ADMIN') || user?.roles?.includes('TENANT_ADMIN')
    return Boolean(isTenantAdmin || user?.planFeatures?.includes('*') || user?.planFeatures?.includes(feature))
  }

  return { supported, planType: user?.planType }
}
