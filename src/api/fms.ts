import { bills, cashFlows, pageOf, payables, profits } from '../data/mock'
import type { Bill, BillItem, CashFlowRow, PageParams, PageResult, Payable, PaymentRecord, ProfitRow } from '../types'
import { adaptPage, idOf, normalizePage, number, statusFromMap, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

const payableStatusText: Record<number, string> = { 0: '待对账', 1: '待付款', 2: '部分付款', 3: '已结清', 4: '逾期' }

function adaptPayable(row: Row): Payable {
  return {
    id: idOf(row),
    payableNo: text(row.payableNo, `AP-${idOf(row)}`),
    sourceBizNo: text(row.sourceBizNo || row.bizNo || row.poNo, '-'),
    supplierName: text(row.supplierName, '-'),
    amount: number(row.payableAmount || row.amount),
    paidAmount: number(row.paidAmount),
    currency: text(row.currency, 'CNY'),
    dueDate: text(row.dueDate, '-'),
    status: statusFromMap(row.status, payableStatusText, '待对账'),
    overdueDays: number(row.overdueDays),
  }
}

function adaptBill(row: Row): Bill {
  return {
    id: idOf(row),
    billNo: text(row.billNo, `BILL-${idOf(row)}`),
    platform: text(row.platform, '-'),
    storeName: text(row.storeName, '-'),
    netAmount: number(row.netAmount || row.settlementAmount),
    currency: text(row.currency, 'USD'),
    status: statusFromMap(row.status, { 0: '待解析', 1: '解析中', 2: '待对账', 3: '对账完成', 4: '解析失败' }, '待解析'),
    importedAt: text(row.importTime || row.importedAt || row.createTime, '-'),
  }
}

function adaptBillItem(row: Row): BillItem {
  return {
    id: idOf(row),
    itemType: text(row.itemType, '-'),
    orderNo: text(row.orderNo, '-'),
    platformSku: text(row.platformSku, '-'),
    amount: number(row.amount),
    currency: text(row.currency, 'USD'),
    description: text(row.description, ''),
    transactionDate: text(row.transactionDate, '-'),
    isMatched: statusFromMap(row.isMatched, { 0: '未匹配', 1: '已匹配' }, '未匹配'),
  }
}

function adaptPaymentRecord(row: Row): PaymentRecord {
  return {
    id: idOf(row),
    payableId: text(row.payableId, ''),
    paymentAmount: number(row.paymentAmount),
    paymentDate: text(row.paymentDate, '-'),
    paymentMethod: statusFromMap(row.paymentMethod, { 1: '银行转账', 2: '线上支付', 3: '现金' }, '其他'),
    voucherNo: text(row.voucherNo, '-'),
    operatorName: text(row.operatorName, '-'),
    remark: text(row.remark, ''),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptProfit(row: Row): ProfitRow {
  const gmv = number(row.gmv || row.grossRevenue || row.grossRevenueCny)
  const purchaseCost = number(row.purchaseCost)
  const logisticsFee = number(row.logisticsFee)
  const platformFee = number(row.platformFee)
  const netProfit = number(row.netProfit)

  return {
    id: idOf(row),
    skuCode: text(row.skuCode, '-'),
    platform: text(row.platform, '-'),
    gmv,
    purchaseCost,
    logisticsFee,
    platformFee,
    netProfit,
    netMargin: number(row.netMargin, gmv ? (netProfit / gmv) * 100 : 0),
  }
}

function adaptCashFlow(row: Row): CashFlowRow {
  return {
    id: idOf(row),
    flowDate: text(row.flowDate, '-'),
    flowType: statusFromMap(row.flowType || row.type, { 1: '收入', 2: '支出' }, '-'),
    sourceNo: text(row.sourceNo || row.bizNo, '-'),
    amount: number(row.amountCny || row.amount),
    remark: text(row.remark, ''),
  }
}

function extractRecords<T>(data: PageResult<T> | T[] | Record<string, unknown>, key = 'records') {
  if (Array.isArray(data)) return data
  const source = data as Record<string, unknown>
  if (Array.isArray(source[key])) return source[key] as T[]
  if (source.records && Array.isArray(source.records)) return source.records as T[]
  return []
}

export async function fetchPayables(params: PageParams): Promise<PageResult<Payable>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/fms/payables', params }), adaptPayable, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(payables.map((item) => adaptPayable(item as unknown as Row)), params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchBills(params: PageParams): Promise<PageResult<Bill>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/fms/bills', params }), adaptBill, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(bills.map((item) => adaptBill(item as unknown as Row)), params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchBillItems(id: string | number, params: PageParams = { pageNum: 1, pageSize: 50 }): Promise<BillItem[]> {
  try {
    const page = await request<PageResult<Row>>({ url: `/api/fms/bills/${id}/items`, params })
    return adaptPage(page, adaptBillItem, params.pageNum, params.pageSize).records
  } catch (error) {
    if (shouldUseMock(error)) return []
    throw error
  }
}

export async function fetchPayablePayments(id: string | number): Promise<PaymentRecord[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/fms/payables/${id}/payments` })
    return rows.map(adaptPaymentRecord)
  } catch (error) {
    if (shouldUseMock(error)) return []
    throw error
  }
}

export async function uploadBill(file: File, payload: { platform?: string; storeId?: string; currency?: string }) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (payload.platform) formData.append('platform', payload.platform)
    if (payload.storeId) formData.append('storeId', payload.storeId)
    if (payload.currency) formData.append('currency', payload.currency)
    return await request<string | number>({ url: '/api/fms/bills/upload', method: 'post', data: formData, headers: { 'Content-Type': 'multipart/form-data' } })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function parseBill(id: string | number) {
  try {
    return await request<Row>({ url: `/api/fms/bills/${id}/parse`, method: 'post' })
  } catch (error) {
    if (shouldUseMock(error)) return {}
    throw error
  }
}

export async function confirmBill(id: string | number) {
  try {
    return await request<void>({ url: `/api/fms/bills/${id}/confirm`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchProfits(params: PageParams): Promise<PageResult<ProfitRow>> {
  try {
    const data = await request<PageResult<Row> | Row[]>({ url: '/api/fms/profit/sku', params })
    const records = extractRecords<Row>(data)
    if (records.length) return pageOf(records.map(adaptProfit), params.pageNum, params.pageSize)
    return adaptPage(normalizePage<Row>(data, params.pageNum, params.pageSize), adaptProfit, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(profits.map((item) => adaptProfit(item as unknown as Row)), params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchCashFlows(params: PageParams): Promise<PageResult<CashFlowRow>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/fms/cash-flow', params }), adaptCashFlow, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(cashFlows.map((item) => adaptCashFlow(item as unknown as Row)), params.pageNum, params.pageSize)
    throw error
  }
}

export async function applyPayable(id: string | number) {
  try {
    return await request<Row>({ url: `/api/fms/payables/${id}/apply`, method: 'post' })
  } catch (error) {
    if (shouldUseMock(error)) return {}
    throw error
  }
}

export async function approvePayable(id: string | number) {
  try {
    return await request<void>({ url: `/api/fms/payables/${id}/approve`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function markPayablePaid(id: string | number) {
  try {
    return await request<void>({ url: `/api/fms/payables/${id}/paid`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function registerPayablePayment(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: `/api/fms/payables/${id}/pay`, method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return id
    throw error
  }
}
