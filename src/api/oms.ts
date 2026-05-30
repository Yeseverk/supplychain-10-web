import { orders, pageOf, refunds } from '../data/mock'
import type { Order, PageParams, PageResult, Refund, TimelineRecord } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

const orderStatusText: Record<number, string> = {
  0: '待处理',
  1: '风控审核',
  2: '待占库',
  3: '备货中',
  4: '待发货',
  5: '已发货',
  6: '运输中',
  7: '已签收',
  8: '已完成',
  9: '售后中',
  10: '已取消',
}

const refundStatusText: Record<number, string> = {
  0: '待审核',
  1: '已通过',
  2: '退货已收',
  3: '已退款',
  4: '已拒绝',
}
const orderStatusValue = Object.fromEntries(Object.entries(orderStatusText).map(([key, value]) => [value, Number(key)]))
const refundStatusValue = Object.fromEntries(Object.entries(refundStatusText).map(([key, value]) => [value, Number(key)]))

function adaptOrder(row: Row): Order {
  return {
    id: idOf(row),
    orderNo: text(row.orderNo, `SO-${idOf(row)}`),
    platformOrderNo: text(row.platformOrderNo, '-'),
    platform: text(row.platform, '-'),
    buyerCountry: text(row.countryCode || row.buyerCountry || row.receiverCountry, '-'),
    amount: number(row.paymentAmount || row.payAmount || row.totalAmount || row.amount),
    currency: text(row.currency, 'USD'),
    status: statusFromMap(row.status, orderStatusText, '待处理'),
    warehouse: text(row.warehouseName || row.warehouse, '-'),
    deliveryDeadline: text(row.deliveryDeadline, '-'),
    abnormal: Boolean(row.abnormal || row.isAbnormal || row.isException),
  }
}

function adaptRefund(row: Row): Refund {
  return {
    id: idOf(row),
    refundNo: text(row.refundNo, `RF-${idOf(row)}`),
    orderNo: text(row.orderNo, '-'),
    refundType: text(row.refundType, '仅退款'),
    amount: number(row.refundAmount || row.amount),
    status: statusFromMap(row.status, refundStatusText, '待审核'),
    reason: text(row.reason, '-'),
  }
}

export async function fetchOrders(params: PageParams): Promise<PageResult<Order>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, orderStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/oms/orders', params: query }), adaptOrder, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, orderStatusText)
      return pageOf(orders.filter((item) => (!keyword || item.orderNo.includes(keyword) || item.platformOrderNo.includes(keyword) || item.platform.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function fetchOrderDetail(id: string | number): Promise<Order> {
  try {
    return adaptOrder(await request<Row>({ url: `/api/oms/orders/${id}` }))
  } catch (error) {
    if (shouldUseMock(error)) return orders.find((item) => String(item.id) === String(id)) || orders[0]
    throw error
  }
}

export async function fetchOrderLogs(id: string | number): Promise<TimelineRecord[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/oms/orders/${id}/logs` })
    return rows.map((row) => ({
      time: text(row.operateTime || row.createTime || row.time, '-'),
      title: text(row.operateType || row.action || row.title, '订单操作'),
      operator: text(row.operatorName || row.operator, '系统'),
    }))
  } catch (error) {
    if (shouldUseMock(error)) return [{ time: '-', title: '暂无真实操作日志', operator: '系统' }]
    throw error
  }
}

export async function fetchRefunds(params: PageParams): Promise<PageResult<Refund>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, refundStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/oms/refunds', params: query }), adaptRefund, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, refundStatusText)
      return pageOf(refunds.filter((item) => (!keyword || item.refundNo.includes(keyword) || item.orderNo.includes(keyword) || item.reason.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function approveOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/oms/orders/${id}/approve`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function rejectOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/oms/orders/${id}/reject`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function cancelOrder(id: string | number, reason: string) {
  try {
    return await request<void>({ url: `/api/oms/orders/${id}/cancel`, method: 'put', data: { reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function flagOrder(id: string | number, reason: string) {
  try {
    return await request<void>({ url: `/api/oms/orders/${id}/flag`, method: 'put', data: { reason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function syncOrder(id: string | number) {
  try {
    return await request<void>({ url: `/api/oms/orders/${id}/sync`, method: 'post' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function auditRefund(id: string | number, approved: boolean, actualRefundAmount?: number, rejectReason?: string) {
  try {
    return await request<void>({ url: `/api/oms/refunds/${id}/audit`, method: 'put', data: { approved, actualRefundAmount, rejectReason } })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function markRefundReceived(id: string | number) {
  try {
    return await request<void>({ url: `/api/oms/refunds/${id}/received`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function completeRefund(id: string | number) {
  try {
    return await request<void>({ url: `/api/oms/refunds/${id}/complete`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}
