import axios, { type AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types'
import { useAuthStore } from '../store/auth'
import { showError, showNotificationWarning, showWarning } from '../utils/feedback'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 9000,
})

export const isMockAllowed = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true'

http.interceptors.request.use((config) => {
  if (config.params && typeof config.params === 'object' && !(config.params instanceof URLSearchParams)) {
    const params = Object.fromEntries(
      Object.entries(config.params as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    )
    if (params.status === '全部') delete params.status
    config.params = params
  }

  const user = useAuthStore.getState().user
  if (user?.tokenValue) config.headers.set(user.tokenName || 'Authorization', user.tokenValue)
  if (user?.tenantCode) config.headers.set('X-Tenant-Code', user.tenantCode)
  return config
})

export const shouldUseMock = (error: unknown) => {
  if (!isMockAllowed || !axios.isAxiosError(error)) return false
  return !error.response || error.code === 'ECONNABORTED' || error.message.includes('Network Error') || [502, 503, 504].includes(error.response.status)
}

const shouldSuppressToastForMockableError = (status: number) => isMockAllowed && [403, 500, 502, 503, 504].includes(status)

const handleBusinessCode = (code: number, msg?: string) => {
  if (shouldSuppressToastForMockableError(code)) return

  if (code === 401) {
    useAuthStore.getState().logout()
    showWarning('登录已失效，请重新登录')
    window.history.replaceState(null, '', '/login')
    return
  }
  if (code === 403) {
    showError('您没有权限执行此操作')
    return
  }
  if (code === 10001) {
    showNotificationWarning('功能升级提示', '当前套餐不支持此功能，升级即可使用')
    return
  }
  if (code === 10002) {
    showError('库存不足，请检查库存')
    return
  }
  if (code === 10003) {
    showError('当前状态不允许此操作')
    return
  }
  if (code === 429) {
    showWarning('操作太频繁，请稍后再试')
    return
  }
  if (code >= 500) {
    showError('服务器错误，请联系管理员')
    return
  }
  showError(msg || '接口返回异常')
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<ApiResponse<T> | T>(config)
    const payload = response.data
    if (payload && typeof payload === 'object' && 'code' in payload && 'data' in payload) {
      const wrapped = payload as ApiResponse<T>
      if (wrapped.code === 200 || wrapped.code === 0) return wrapped.data
      handleBusinessCode(wrapped.code, wrapped.msg)
      throw new Error(wrapped.msg || '接口返回异常')
    }
    return payload as T
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status
      if ([401, 403, 429].includes(status) || status >= 500) handleBusinessCode(status, error.message)
    }
    throw error
  }
}
