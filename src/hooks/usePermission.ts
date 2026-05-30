import { useAuthStore } from '../store/auth'
import { hasPermission } from '../utils/permissions'

export function usePermission() {
  const user = useAuthStore((state) => state.user)

  const can = (permission?: string) => {
    return hasPermission(user?.permissions, user?.roles, permission)
  }

  return { can, permissions: user?.permissions || [] }
}
