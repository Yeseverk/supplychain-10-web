import { logisticsChannels, pageOf, waybills } from '../data/mock'
import type { LogisticsChannel, PageParams, PageResult, TrackNode, Waybill } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

export type RecommendPayload = {
  countryCode: string
  actualWeightG: number
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  hasBattery?: boolean
  hasLiquid?: boolean
  hasPowder?: boolean
  declaredValue?: number
  declaredCurrency?: string
  maxDaysRequired?: number
}

export type RecommendedChannel = {
  channelId: string
  channelCode: string
  channelName: string
  minDays: number
  maxDays: number
  estimatedFee: number
  currency: string
  totalScore: number
  tips: string
}

export type RecommendResult = {
  chargeWeightG: number
  recommendations: RecommendedChannel[]
}

export type CreateWaybillPayload = {
  channelId?: number
  orderId: number
  orderNo: string
  warehouseId: number
  receiverName: string
  receiverPhone?: string
  countryCode: string
  state?: string
  city?: string
  addressLine1: string
  addressLine2?: string
  zipCode: string
  actualWeightG: number
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  declaredValue: number
  declaredCurrency?: string
  declaredNameEn: string
  hsCode?: string
  isGift?: number
  hasBattery?: boolean
  hasLiquid?: boolean
  hasPowder?: boolean
}

export type WaybillStatusPayload = {
  status: number
  remark?: string
}

export type CreateChannelPayload = {
  carrierId: number
  channelCode: string
  channelName: string
  channelType: number
  countryCodes: string
  minWeightG?: number
  maxWeightG: number
  maxLengthMm?: number
  maxGirthMm?: number
  allowBattery?: number
  allowLiquid?: number
  allowPowder?: number
  allowFood?: number
  minDays: number
  maxDays: number
  volumeFactor?: number
  declaredValueLimit?: number
  sortOrder?: number
  remark?: string
}

const waybillStatusText: Record<number, string> = {
  0: '待揽收',
  1: '已揽收',
  2: '运输中',
  3: '到达分拨',
  4: '清关中',
  5: '派送中',
  6: '派件中',
  7: '已签收',
  8: '异常',
  10: '已取消',
}

const channelStatusText: Record<number, string> = { 0: '已停用', 1: '正常' }
const waybillStatusValue = Object.fromEntries(Object.entries(waybillStatusText).map(([key, value]) => [value, Number(key)]))
const channelStatusValue = Object.fromEntries(Object.entries(channelStatusText).map(([key, value]) => [value, Number(key)]))

const carrierNameById: Record<string, string> = {
  '910000000000001101': 'YunExpress',
  '910000000000001102': 'DHL',
}

const channelNameById: Record<string, string> = {
  '910000000000001111': 'YunExpress US Standard',
  '910000000000001112': 'DHL Paket DE',
}

function inferCarrierName(row: Row) {
  const carrierId = text(row.carrierId, '')
  const channelName = text(row.channelName, '')
  if (row.carrierName) return text(row.carrierName)
  if (carrierNameById[carrierId]) return carrierNameById[carrierId]
  if (/DHL/i.test(channelName)) return 'DHL'
  if (/Yun|云途/i.test(channelName)) return 'YunExpress'
  return '-'
}

function adaptWaybill(row: Row): Waybill {
  const status = statusFromMap(row.status, waybillStatusText, '运输中')
  return {
    id: idOf(row),
    waybillNo: text(row.waybillNo, `WB-${idOf(row)}`),
    trackingNo: text(row.trackingNo, '-'),
    carrierName: inferCarrierName(row),
    channelName: text(row.channelName || row.logisticsChannel || channelNameById[text(row.channelId, '')], '-'),
    orderNo: text(row.orderNo, '-'),
    countryCode: text(row.countryCode, '-'),
    status,
    currentTrack: text(row.currentTrack || row.latestTrack || row.exceptionDesc, status),
    fee: number(row.actualFee || row.estimatedFee || row.fee),
    feeCurrency: text(row.feeCurrency, 'CNY'),
    createdAt: text(row.createTime || row.createdAt || row.createWaybillTime, '-'),
  }
}

function adaptChannel(row: Row): LogisticsChannel {
  return {
    id: idOf(row),
    channelName: text(row.channelName, '-'),
    carrierName: inferCarrierName(row),
    countryCodes: text(row.countryCodes, '-'),
    status: statusFromMap(row.status, channelStatusText, '正常'),
  }
}

export async function fetchWaybills(params: PageParams): Promise<PageResult<Waybill>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, waybillStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/tms/waybills', params: query }), adaptWaybill, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, waybillStatusText)
      return pageOf(waybills.filter((item) => (!keyword || item.waybillNo.includes(keyword) || item.trackingNo.includes(keyword) || item.orderNo.includes(keyword) || item.channelName.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function createWaybill(payload: CreateWaybillPayload) {
  try {
    return await request<number>({ url: '/api/tms/waybills', method: 'post', data: payload })
  } catch (error) {
    if (shouldUseMock(error)) return Number(Date.now())
    throw error
  }
}

export async function fetchWaybillTracks(id: string | number): Promise<TrackNode[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/tms/waybills/${id}/tracks` })
    return rows.map((row) => ({
      time: text(row.trackTime || row.createTime || row.time, '-'),
      location: text(row.location, '-'),
      description: text(row.trackDesc || row.description || row.content, '-'),
      exception: Boolean(row.exception || row.isException),
    }))
  } catch (error) {
    if (shouldUseMock(error)) return [{ time: '-', location: '-', description: '暂无真实轨迹', exception: false }]
    throw error
  }
}

export async function refreshWaybillTracks(id: string | number) {
  try {
    return await request<void>({ url: `/api/tms/waybills/${id}/tracks/refresh`, method: 'post' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function updateWaybillStatus(id: string | number, payload: WaybillStatusPayload) {
  try {
    return await request<void>({ url: `/api/tms/waybills/${id}/status`, method: 'put', data: payload })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function cancelWaybill(id: string | number) {
  try {
    return await request<void>({ url: `/api/tms/waybills/${id}/cancel`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchLogisticsChannels(params: PageParams): Promise<PageResult<LogisticsChannel>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, channelStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/tms/channels', params: query }), adaptChannel, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, channelStatusText)
      return pageOf(logisticsChannels.filter((item) => (!keyword || item.channelName.includes(keyword) || item.carrierName.includes(keyword) || item.countryCodes.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function createLogisticsChannel(payload: CreateChannelPayload) {
  try {
    return await request<number>({ url: '/api/tms/channels', method: 'post', data: payload })
  } catch (error) {
    if (shouldUseMock(error)) return Number(Date.now())
    throw error
  }
}

export async function disableLogisticsChannel(id: string | number) {
  try {
    return await request<void>({ url: `/api/tms/channels/${id}/disable`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function recommendLogisticsChannel(payload: RecommendPayload): Promise<RecommendResult> {
  try {
    const data = await request<Row>({ url: '/api/tms/recommend', method: 'post', data: payload })
    const recommendations = Array.isArray(data.recommendations) ? (data.recommendations as Row[]) : []
    return {
      chargeWeightG: number(data.chargeWeightG || payload.actualWeightG),
      recommendations: recommendations.map((row) => ({
        channelId: text(row.channelId),
        channelCode: text(row.channelCode),
        channelName: text(row.channelName),
        minDays: number(row.minDays),
        maxDays: number(row.maxDays),
        estimatedFee: number(row.estimatedFee),
        currency: text(row.currency, 'USD'),
        totalScore: number(row.totalScore),
        tips: text(row.tips, ''),
      })),
    }
  } catch (error) {
    if (shouldUseMock(error)) {
      return {
        chargeWeightG: payload.actualWeightG,
        recommendations: logisticsChannels.map((item, index) => ({
          channelId: item.id,
          channelCode: item.carrierName,
          channelName: item.channelName,
          minDays: index === 0 ? 5 : 7,
          maxDays: index === 0 ? 8 : 12,
          estimatedFee: index === 0 ? 8.6 : 10.2,
          currency: 'USD',
          totalScore: index === 0 ? 92 : 84,
          tips: index === 0 ? '价格与时效均衡，适合当前目的国和重量段。' : '覆盖国家广，旺季稳定性较好。',
        })),
      }
    }
    throw error
  }
}
