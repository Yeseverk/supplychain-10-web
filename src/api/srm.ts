import { pageOf, suppliers } from '../data/mock'
import type { PageParams, PageResult, Supplier } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

const supplierStatus: Record<number, string> = { 0: '草稿', 1: '待审核', 2: '已通过', 3: '已拒绝', 4: '已停用' }
const supplierStatusValue = Object.fromEntries(Object.entries(supplierStatus).map(([key, value]) => [value, Number(key)]))

function adaptSupplier(row: Row): Supplier {
  return {
    id: idOf(row),
    version: number(row.version),
    supplierCode: text(row.supplierCode, `SUP-${idOf(row)}`),
    supplierName: text(row.supplierName || row.name, '未命名供应商'),
    supplierType: text(row.supplierTypeName || row.supplierType || row.type, '供应商'),
    contactName: text(row.contactName, '-'),
    contactPhone: text(row.contactPhone || row.phone, '-'),
    contactEmail: text(row.contactEmail, ''),
    province: text(row.province, ''),
    city: text(row.city, ''),
    currency: text(row.currency, ''),
    leadTimeDays: number(row.leadTimeDays),
    remark: text(row.remark, ''),
    grade: text(row.grade, 'B'),
    score: number(row.score || row.currentScore),
    status: text(row.statusName, '') !== '-' ? text(row.statusName) : statusFromMap(row.status, supplierStatus, '待审核'),
    qualificationWarning: Boolean(row.qualificationWarning || row.certWarning || row.certExpireWarning),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

export async function fetchSuppliers(params: PageParams): Promise<PageResult<Supplier>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, supplierStatusValue)
    if (keyword) query.supplierName = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/srm/suppliers', params: query }), adaptSupplier, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, supplierStatus)
      return pageOf(suppliers.filter((item) => (!keyword || item.supplierName.includes(keyword) || item.supplierCode.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function fetchSupplierDetail(id: string | number): Promise<Supplier> {
  try {
    return adaptSupplier(await request<Row>({ url: `/api/srm/suppliers/${id}` }))
  } catch (error) {
    if (shouldUseMock(error)) return suppliers.find((item) => String(item.id) === String(id)) || suppliers[0]
    throw error
  }
}

export async function createSupplier(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/srm/suppliers', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function updateSupplier(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/srm/suppliers/${id}`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function auditSupplier(id: string | number, approved: boolean, reason?: string) {
  try {
    return await request<void>({ url: `/api/srm/suppliers/${id}/${approved ? 'approve' : 'reject'}`, method: 'put', data: { auditRemark: reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function requestSupplierSupplement(id: string | number, reason: string) {
  try {
    return await request<void>({ url: `/api/srm/suppliers/${id}/supplement`, method: 'put', data: { auditRemark: reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function disableSupplier(id: string | number, reason: string) {
  try {
    return await request<void>({ url: `/api/srm/suppliers/${id}/disable`, method: 'put', data: { auditRemark: reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function enableSupplier(id: string | number, reason: string) {
  try {
    return await request<void>({ url: `/api/srm/suppliers/${id}/enable`, method: 'put', data: { auditRemark: reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}
