import { pageOf, purchaseInquiries, purchaseOrders, purchaseReceipts, purchaseRequisitions } from '../data/mock'
import type { PageParams, PageResult, PurchaseInquiry, PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseRequisition, ReceiptRecord } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { fetchPayables } from './fms'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

export const purchaseStatusText: Record<number, string> = {
  0: '草稿',
  1: '待供应商确认',
  2: '已确认',
  3: '发货中',
  4: '部分到货',
  5: '全部到货',
  6: '已对账',
  7: '已结清',
  8: '已取消',
}

const purchaseStatusValue = Object.fromEntries(Object.entries(purchaseStatusText).map(([key, value]) => [value, Number(key)]))
const requisitionStatusText: Record<number, string> = { 0: '草稿', 1: '待审核', 2: '已通过', 3: '已拒绝' }
const requisitionStatusValue = Object.fromEntries(Object.entries(requisitionStatusText).map(([key, value]) => [value, Number(key)]))
const inquiryStatusText: Record<number, string> = { 0: '草稿', 1: '询价中', 2: '已报价', 3: '已选定', 4: '已关闭' }
const inquiryStatusValue = Object.fromEntries(Object.entries(inquiryStatusText).map(([key, value]) => [value, Number(key)]))
const receiptStatusText: Record<number, string> = { 0: '待质检', 1: '入库中', 2: '部分入库', 3: '全部入库', 4: '拒收' }

function isOverdue(expectedDate?: string, status?: string) {
  if (!expectedDate || expectedDate === '-') return false
  return !['全部到货', '已对账', '已结清', '已取消'].includes(status || '') && new Date(expectedDate).getTime() < Date.now()
}

function adaptPurchaseItem(row: Row): PurchaseOrderItem {
  return {
    id: idOf(row),
    skuCode: text(row.skuCode, '-'),
    name: text(row.skuName || row.name, '-'),
    spec: text(row.spec, '-'),
    quantity: number(row.quantity),
    receivedQuantity: number(row.receivedQty || row.receivedQuantity),
    unitPrice: number(row.unitPrice),
  }
}

function adaptReceiptRecord(row: Row): ReceiptRecord {
  return {
    id: idOf(row),
    receiptNo: text(row.receiptNo, `RCV-${idOf(row)}`),
    receivedAt: text(row.receiveDate || row.receivedAt || row.createTime, '-'),
    operator: text(row.receiverName || row.operator, '仓储人员'),
    quantity: number(row.passQty || row.actualQty || row.totalQty || row.quantity),
  }
}

function adaptPurchaseOrder(row: Row, items: PurchaseOrderItem[] = [], receipts: ReceiptRecord[] = []): PurchaseOrder {
  const status = statusFromMap(row.status, purchaseStatusText, '待处理')
  const totalAmount = number(row.totalAmount)
  const currency = text(row.currency, 'CNY')
  const exchangeRate = number(row.exchangeRate, 1)
  const expectedDate = text(row.expectedDate || row.expectedArrivalDate, '-')

  return {
    id: idOf(row),
    orderNo: text(row.poNo || row.orderNo, `PO-${idOf(row)}`),
    supplierName: text(row.supplierName, '未绑定供应商'),
    supplierType: text(row.supplierType, '供应商'),
    currency,
    totalAmount,
    rmbAmount: currency === 'CNY' ? totalAmount : totalAmount * exchangeRate,
    status,
    warehouse: text(row.warehouseName || row.warehouse, '-'),
    expectedArrivalDate: expectedDate,
    overdue: isOverdue(expectedDate, status),
    createdAt: text(row.createTime || row.createdAt || row.orderDate, '-'),
    items,
    receipts,
    timeline: [
      { time: text(row.createTime || row.orderDate, '-'), title: '采购单创建', operator: '系统' },
      { time: text(row.confirmedDate, '-'), title: '供应商确认', operator: text(row.supplierName, '供应商') },
      { time: text(row.actualDeliveryDate || row.expectedDate, '-'), title: `当前状态：${status}`, operator: '系统' },
    ].filter((item) => item.time !== '-'),
    payable: { amount: totalAmount, dueDate: expectedDate, status: '待对账' },
  }
}

function adaptRequisition(row: Row): PurchaseRequisition {
  return {
    id: idOf(row),
    reqNo: text(row.reqNo, `REQ-${idOf(row)}`),
    title: text(row.title || row.remark, '采购申请'),
    applicantName: text(row.applicantName || row.applyUserName, '申请人'),
    status: statusFromMap(row.status, requisitionStatusText),
    amount: number(row.totalAmount || row.amount),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptInquiry(row: Row): PurchaseInquiry {
  return {
    id: idOf(row),
    inquiryNo: text(row.inquiryNo, `INQ-${idOf(row)}`),
    supplierName: text(row.supplierName, '多供应商询价'),
    status: statusFromMap(row.status, inquiryStatusText),
    deadline: text(row.deadline || row.quoteDeadline, '-'),
    quotedCount: number(row.quotedCount || row.quoteCount),
  }
}

function adaptReceipt(row: Row): PurchaseReceipt {
  return {
    id: idOf(row),
    receiptNo: text(row.receiptNo, `RCV-${idOf(row)}`),
    poNo: text(row.poNo || row.sourceNo, '-'),
    warehouseName: text(row.warehouseName, '-'),
    status: statusFromMap(row.status, receiptStatusText, '待质检'),
    totalQty: number(row.totalQty),
    actualQty: number(row.actualQty || row.passQty || row.totalQty),
    createdAt: text(row.createTime || row.createdAt || row.receiveDate, '-'),
  }
}

export async function fetchPurchaseOrders(params: PageParams): Promise<PageResult<PurchaseOrder>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, purchaseStatusValue)
    if (keyword) query.poNo = keyword
    if (status !== undefined) query.status = status

    const page = await request<PageResult<Row>>({ url: '/api/pms/orders/page', params: query })
    return adaptPage(page, (row) => adaptPurchaseOrder(row), params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, purchaseStatusText)
      return pageOf(
        purchaseOrders
          .map((item) => adaptPurchaseOrder(item as unknown as Row, item.items, item.receipts))
          .filter((item) => (!keyword || item.orderNo.includes(keyword) || item.supplierName.includes(keyword)) && (!status || item.status === status)),
        params.pageNum,
        params.pageSize,
      )
    }
    throw error
  }
}

export async function fetchPurchaseOrderDetail(id: string | number): Promise<PurchaseOrder> {
  try {
    const detail = await request<Row>({ url: `/api/pms/orders/${id}/detail` }).catch(() => request<Row>({ url: `/api/pms/orders/${id}` }))
    const orderRow = (detail.order || detail) as Row
    const items = Array.isArray(detail.items) ? (detail.items as Row[]).map(adaptPurchaseItem) : []
    const receipts = Array.isArray(detail.receipts) ? (detail.receipts as Row[]).map(adaptReceiptRecord) : []
    const order = adaptPurchaseOrder(orderRow, items, receipts)

    const payables = await fetchPayables({ pageNum: 1, pageSize: 100 }).catch(() => undefined)
    const payable = payables?.records.find((item) => item.sourceBizNo === order.orderNo)
    if (payable) {
      order.payable = { amount: payable.amount, dueDate: payable.dueDate, status: payable.status }
    }

    return order
  } catch (error) {
    if (shouldUseMock(error)) {
      const mockDetail = purchaseOrders.find((item) => String(item.id) === String(id)) || purchaseOrders[0]
      return adaptPurchaseOrder(mockDetail as unknown as Row, mockDetail.items, mockDetail.receipts)
    }
    throw error
  }
}

export async function fetchPurchaseRequisitions(params: PageParams): Promise<PageResult<PurchaseRequisition>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, requisitionStatusValue)
    if (keyword) {
      if (/^(PR|REQ|CGSQ|采购申请)/i.test(keyword)) query.reqNo = keyword
      else query.title = keyword
    }
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/pms/requisitions/page', params: query }), adaptRequisition, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, requisitionStatusText)
      return pageOf(
        purchaseRequisitions
          .map((item) => adaptRequisition(item as unknown as Row))
          .filter((item) => (!keyword || item.reqNo.includes(keyword) || item.title.includes(keyword)) && (!status || item.status === status)),
        params.pageNum,
        params.pageSize,
      )
    }
    throw error
  }
}

export async function fetchPurchaseRequisitionDetail(id: string | number): Promise<PurchaseRequisition> {
  try {
    return adaptRequisition(await request<Row>({ url: `/api/pms/requisitions/${id}` }))
  } catch (error) {
    if (shouldUseMock(error)) {
      const row = purchaseRequisitions.find((item) => String(item.id) === String(id)) || purchaseRequisitions[0]
      return adaptRequisition(row as unknown as Row)
    }
    throw error
  }
}

export async function auditPurchaseRequisition(id: string | number, approved: boolean, remark: string) {
  try {
    return await request<void>({ url: `/api/pms/requisitions/${id}/${approved ? 'approve' : 'reject'}`, method: 'put', data: { auditUserId: 1, auditRemark: remark } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function createPurchaseRequisition(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/pms/requisitions', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function submitPurchaseRequisition(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/requisitions/${id}/submit`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchPurchaseInquiries(params: PageParams): Promise<PageResult<PurchaseInquiry>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, inquiryStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/pms/inquiries/page', params: query }), adaptInquiry, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, inquiryStatusText)
      return pageOf(
        purchaseInquiries
          .map((item) => adaptInquiry(item as unknown as Row))
          .filter((item) => (!keyword || item.inquiryNo.includes(keyword) || item.supplierName.includes(keyword)) && (!status || item.status === status)),
        params.pageNum,
        params.pageSize,
      )
    }
    throw error
  }
}

export async function comparePurchaseInquiry(reqId: string | number): Promise<Record<string, unknown>[]> {
  try {
    return await request<Record<string, unknown>[]>({ url: '/api/pms/inquiries/compare', params: { reqId } })
  } catch (error) {
    if (shouldUseMock(error)) return []
    throw error
  }
}

export async function selectPurchaseInquiry(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/inquiries/${id}/select`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchPurchaseReceipts(params: PageParams): Promise<PageResult<PurchaseReceipt>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/pms/receipts/page', params }), adaptReceipt, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(purchaseReceipts.map((item) => adaptReceipt(item as unknown as Row)), params.pageNum, params.pageSize)
    throw error
  }
}

export async function confirmPurchaseReceipt(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/receipts/${id}/confirm`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function createPurchaseReceipt(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/pms/receipts', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function urgePurchaseOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/orders/${id}/send`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function createPurchaseOrder(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/pms/orders', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function confirmPurchaseOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/orders/${id}/confirm`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function markPurchaseOrderShipping(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/orders/${id}/shipping`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function reconcilePurchaseOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/orders/${id}/reconcile`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function cancelPurchaseOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/pms/orders/${id}/cancel`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}
