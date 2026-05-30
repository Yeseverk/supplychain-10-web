import { demoUser } from '../data/mock'
import type { AuthUser } from '../types'
import { repairText } from './helpers'
import { request, shouldUseMock } from './request'

export type LoginPayload = {
  tenantCode: string
  username: string
  password: string
  remember?: boolean
}

function normalizeUser(user: Partial<AuthUser>): AuthUser {
  const roles = user.roles || []
  const permissions = user.permissions || []
  const planFeatures = user.planFeatures?.includes('*') || roles.includes('ROLE_TENANT_ADMIN') || roles.includes('TENANT_ADMIN') ? ['*'] : user.planFeatures || []

  return {
    tokenName: user.tokenName || 'Authorization',
    tokenValue: user.tokenValue || '',
    refreshToken: user.refreshToken,
    userId: user.userId || '',
    tenantId: user.tenantId || '',
    tenantCode: user.tenantCode || '',
    username: user.username || '',
    realName: repairText(user.realName || user.username || '当前用户'),
    planType: user.planType,
    roles,
    permissions,
    planFeatures,
  }
}

export async function loginApi(payload: LoginPayload): Promise<AuthUser> {
  try {
    const user = await request<AuthUser>({ url: '/api/auth/login', method: 'post', data: payload })
    return normalizeUser(user)
  } catch (error) {
    if (shouldUseMock(error)) return normalizeUser(demoUser)
    throw error
  }
}

export async function logoutApi(refreshToken?: string) {
  try {
    await request<void>({ url: '/api/auth/logout', method: 'post', data: { refreshToken } })
  } catch (error) {
    if (!shouldUseMock(error)) throw error
  }
}
