import type { PageResult } from '../types'

function looksSuspiciousText(value: string) {
  const hasChineseText = /[\u4e00-\u9fa5]/.test(value)
  const hasNonPrintableAscii = Array.from(value).some((char) => {
    const code = char.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  })
  const hasExtendedLatin = Array.from(value).some((char) => {
    const code = char.charCodeAt(0)
    return code >= 128 && code < 256
  })

  return hasNonPrintableAscii || (!hasChineseText && hasExtendedLatin)
}

export function repairText(value: string) {
  if (!looksSuspiciousText(value)) return value

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return /[\u4e00-\u9fa5]/.test(decoded) ? decoded : value
  } catch {
    return value
  }
}

export function text(value: unknown, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback
  return repairText(String(value))
}

export function number(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export function idOf(row: Record<string, unknown>) {
  return text(row.id || row.supplierId || row.spuId || row.skuId || row.orderId || row.poId || row.receiptId || row.payableId || row.waybillId)
}

export function normalizePage<T>(data: PageResult<T> | T[] | Record<string, unknown>, pageNum = 1, pageSize = 20): PageResult<T> {
  if (Array.isArray(data)) return { pageNum, pageSize, current: pageNum, size: pageSize, total: data.length, pages: 1, records: data }

  const source = data as PageResult<T> & Record<string, unknown>
  const records = (source.records || source.list || source.rows || []) as T[]
  const total = number(source.total, records.length)
  const size = number(source.pageSize || source.size, pageSize)

  return {
    ...source,
    pageNum: number(source.pageNum || source.current, pageNum),
    pageSize: size,
    current: number(source.current || source.pageNum, pageNum),
    size,
    total,
    pages: number(source.pages, Math.max(1, Math.ceil(total / Math.max(size, 1)))),
    records,
  }
}

export function adaptPage<T, R>(page: PageResult<T> | T[] | Record<string, unknown>, adapter: (row: T) => R, pageNum = 1, pageSize = 20): PageResult<R> {
  const normalized = normalizePage<T>(page, pageNum, pageSize)
  return { ...normalized, records: normalized.records.map(adapter) }
}

export function statusFromMap(status: unknown, map: Record<number, string>, fallback = '待处理') {
  if (typeof status === 'number') return map[status] || `${fallback} ${status}`
  if (typeof status === 'string' && /^\d+$/.test(status)) return map[Number(status)] || `${fallback} ${status}`
  return text(status, fallback)
}

export function statusParam(status: unknown, labelMap?: Record<string, number>) {
  if (status === undefined || status === null || status === '') return undefined
  if (typeof status === 'number' && Number.isFinite(status)) return status

  const value = String(status).trim()
  if (!value || value === '全部') return undefined
  if (/^-?\d+$/.test(value)) return Number(value)
  return labelMap?.[value]
}

export function statusLabel(status: unknown, valueMap: Record<number, string>) {
  const value = statusParam(status)
  if (typeof value === 'number') return valueMap[value]
  return typeof status === 'string' ? status.trim() : undefined
}
