import { inboundOrders, inventoryItems, inventoryLogs, outboundOrders, pageOf, stocktakeTasks, warehouses } from '../data/mock'
import type { InboundOrder, InboundOrderItem, InventoryItem, InventoryLog, OutboundOrder, PageParams, PageResult, StocktakeItem, StocktakeTask, Warehouse, WarehouseLocation } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

const inboundStatusText: Record<number, string> = { 0: '待入库', 1: '入库中', 2: '已完成', 3: '已取消' }
const stocktakeStatusText: Record<number, string> = { 0: '待处理', 1: '盘点中', 2: '待审核差异', 3: '已完成' }
const outboundStatusText: Record<number, string> = { 0: '分配中', 1: '待拣货', 2: '拣货中', 3: '待复核', 4: '已出库', 5: '已取消' }
const inboundStatusValue = Object.fromEntries(Object.entries(inboundStatusText).map(([key, value]) => [value, Number(key)]))
const stocktakeStatusValue = Object.fromEntries(Object.entries(stocktakeStatusText).map(([key, value]) => [value, Number(key)]))
const outboundStatusValue = Object.fromEntries(Object.entries(outboundStatusText).map(([key, value]) => [value, Number(key)]))
const logTypeText: Record<number, string> = { 1: '采购入库', 2: '销售出库', 5: '盘盈入库', 6: '盘亏出库', 11: '库存冻结', 12: '库存解冻' }
const warehouseNameById: Record<string, string> = {
  '910000000000000501': '洛杉矶海外仓',
  '910000000000000502': '宁波国内仓',
  '910000000000000503': '汉堡欧洲仓',
}

function warningStatus(availableQty: number, safetyQty: number): InventoryItem['warningStatus'] {
  if (availableQty <= 0) return 'zero'
  if (availableQty < safetyQty * 0.3) return 'low'
  if (availableQty < safetyQty) return 'tight'
  return 'normal'
}

function warehouseName(row: Row) {
  return text(row.warehouseName || row.warehouse || warehouseNameById[text(row.warehouseId, '')], '-')
}

function adaptWarehouse(row: Row): Warehouse {
  return {
    id: idOf(row),
    warehouseCode: text(row.warehouseCode, `WH-${idOf(row)}`),
    warehouseName: text(row.warehouseName || warehouseNameById[idOf(row)], '未命名仓库'),
    warehouseType: number(row.warehouseType),
    countryCode: text(row.countryCode, ''),
    countryName: text(row.countryName, ''),
    province: text(row.province, ''),
    city: text(row.city, ''),
    address: text(row.address, ''),
    zipCode: text(row.zipCode, ''),
    contactName: text(row.contactName, ''),
    contactPhone: text(row.contactPhone, ''),
    contactEmail: text(row.contactEmail, ''),
    areaSqm: number(row.areaSqm),
    isDefault: number(row.isDefault),
    status: statusFromMap(row.status, { 0: '已停用', 1: '正常' }, '正常'),
    remark: text(row.remark, ''),
  }
}

function adaptInventory(row: Row): InventoryItem {
  const physicalQty = number(row.quantity || row.physicalQty)
  const frozenQty = number(row.frozenQty)
  const defectiveQty = number(row.defectiveQty)
  const availableQty = number(row.availableQty, physicalQty - frozenQty - defectiveQty)
  const safetyQty = number(row.safetyStock || row.safetyQty)

  return {
    id: idOf(row),
    warehouseId: text(row.warehouseId, ''),
    skuId: text(row.skuId, ''),
    skuCode: text(row.skuCode, `SKU-${text(row.skuId, 'UNKNOWN')}`),
    skuName: text(row.skuName, '未命名 SKU'),
    spec: text(row.spec, '-'),
    warehouse: warehouseName(row),
    physicalQty,
    availableQty,
    frozenQty,
    inboundQty: number(row.inTransitQty || row.inboundQty),
    defectiveQty,
    safetyQty,
    warningStatus: warningStatus(availableQty, safetyQty),
    lastInboundAt: text(row.lastInboundTime || row.lastInboundAt, '-'),
  }
}

function adaptInventoryLog(row: Row): InventoryLog {
  return {
    id: idOf(row),
    skuCode: text(row.skuCode),
    warehouse: warehouseName(row),
    type: statusFromMap(row.logType, logTypeText, '流水'),
    changeQty: number(row.changeQty),
    beforeQty: number(row.beforeQty),
    afterQty: number(row.afterQty),
    operator: text(row.operatorName || row.operator, '系统'),
    operatedAt: text(row.operateTime || row.operatedAt, '-'),
    remark: text(row.remark, ''),
  }
}

function adaptInbound(row: Row): InboundOrder {
  return {
    id: idOf(row),
    inboundNo: text(row.inboundNo, `IN-${idOf(row)}`),
    sourceNo: text(row.refNo || row.sourceNo, '-'),
    warehouseId: text(row.warehouseId, ''),
    warehouse: warehouseName(row),
    status: statusFromMap(row.status, inboundStatusText, '待入库'),
    skuCount: number(row.totalSkuCount || row.skuCount),
    plannedQty: number(row.totalQty || row.plannedQty),
    receivedQty: number(row.actualQty || row.receivedQty),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptInboundItem(row: Row): InboundOrderItem {
  return {
    id: idOf(row),
    skuId: text(row.skuId, ''),
    skuCode: text(row.skuCode, '-'),
    skuName: text(row.skuName, '-'),
    expectedQty: number(row.expectedQty || row.quantity),
    actualQty: number(row.actualQty),
    defectiveQty: number(row.defectiveQty),
    locationId: text(row.locationId, ''),
    locationCode: text(row.locationCode, ''),
    unitCost: number(row.unitCost),
    remark: text(row.remark, ''),
  }
}

function adaptLocation(row: Row): WarehouseLocation {
  return {
    id: idOf(row),
    warehouseId: text(row.warehouseId, ''),
    locationCode: text(row.locationCode, '-'),
    zone: text(row.zone, ''),
    isOccupied: number(row.isOccupied),
    status: number(row.status),
  }
}

function adaptOutbound(row: Row): OutboundOrder {
  const status = statusFromMap(row.status, outboundStatusText, '待拣货')
  const plannedQty = number(row.totalQty || row.plannedQty)
  return {
    id: idOf(row),
    outboundNo: text(row.outboundNo, `OUT-${idOf(row)}`),
    orderNo: text(row.refNo || row.orderNo, '-'),
    orderId: text(row.refId || row.orderId, ''),
    warehouseId: text(row.warehouseId, ''),
    refType: text(row.refType, ''),
    refNo: text(row.refNo || row.orderNo, ''),
    warehouse: warehouseName(row),
    status,
    plannedQty,
    shippedQty: status === '已出库' ? number(row.actualQty || row.shippedQty, plannedQty) : number(row.actualQty || row.shippedQty),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptStocktake(row: Row): StocktakeTask {
  const status = statusFromMap(row.status, stocktakeStatusText, '待处理')
  return {
    id: idOf(row),
    taskNo: text(row.taskNo, `STK-${idOf(row)}`),
    type: text(row.taskName || row.type, '盘点任务'),
    warehouse: warehouseName(row),
    status,
    progress: status === '已完成' || status === '待审核差异' ? 100 : status === '盘点中' ? 60 : 0,
    profitQty: number(row.profitQty),
    lossQty: number(row.lossQty),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptStocktakeItem(row: Row): StocktakeItem {
  return {
    id: idOf(row),
    warehouseId: text(row.warehouseId, ''),
    locationId: text(row.locationId, ''),
    locationCode: text(row.locationCode, ''),
    skuId: text(row.skuId, ''),
    skuCode: text(row.skuCode, '-'),
    skuName: text(row.skuName, '-'),
    bookQty: number(row.bookQty),
    actualQty: row.actualQty === undefined || row.actualQty === null ? undefined : number(row.actualQty),
    diffQty: row.diffQty === undefined || row.diffQty === null ? undefined : number(row.diffQty),
    diffReason: text(row.diffReason, ''),
    isAdjusted: number(row.isAdjusted),
  }
}

export async function fetchWarehouses(params: PageParams): Promise<PageResult<Warehouse>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/warehouses', params }), adaptWarehouse, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(warehouses, params.pageNum, params.pageSize)
    throw error
  }
}

export async function createWarehouse(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/wms/warehouses', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function updateWarehouse(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/wms/warehouses/${id}`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function createStocktake(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/wms/stocktake', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function fetchInventory(params: PageParams): Promise<PageResult<InventoryItem>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/inventory', params }), adaptInventory, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(inventoryItems, params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchInventoryLogs(params: PageParams & { skuCode?: string; warehouse?: string }): Promise<PageResult<InventoryLog>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/inventory/logs', params }), adaptInventoryLog, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(inventoryLogs, params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchOutboundPicklist(id: string | number): Promise<InboundOrderItem[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/wms/outbound/${id}/picklist` })
    return rows.map(adaptInboundItem)
  } catch (error) {
    if (shouldUseMock(error)) {
      const order = outboundOrders.find((item) => String(item.id) === String(id))
      if (!order) return []
      return [
        {
          id: `${id}-pick-1`,
          skuId: '910000000000000401',
          skuCode: 'SKU-BT-BLACK',
          skuName: '蓝牙降噪耳机 Pro 黑色',
          expectedQty: order.plannedQty,
          actualQty: order.shippedQty,
          defectiveQty: 0,
        },
      ]
    }
    throw error
  }
}

export async function adjustInventory(_id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: '/api/wms/inventory/adjust', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchInboundOrders(params: PageParams): Promise<PageResult<InboundOrder>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, inboundStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/inbound', params: query }), adaptInbound, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, inboundStatusText)
      return pageOf(inboundOrders.filter((item) => (!keyword || item.inboundNo.includes(keyword) || item.sourceNo.includes(keyword) || item.warehouse.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function fetchInboundOrderItems(id: string | number): Promise<InboundOrderItem[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/wms/inbound/${id}/items` })
    return rows.map(adaptInboundItem)
  } catch (error) {
    if (shouldUseMock(error)) {
      const order = inboundOrders.find((item) => String(item.id) === String(id))
      if (!order) return []
      return [
        {
          id: `${id}-item-1`,
          skuId: '910000000000000401',
          skuCode: 'SKU-BT-BLACK',
          skuName: '蓝牙降噪耳机 Pro 黑色',
          expectedQty: order.plannedQty,
          actualQty: order.receivedQty,
          defectiveQty: 0,
        },
      ]
    }
    throw error
  }
}

export async function fetchWarehouseLocations(warehouseId: string | number, available = false): Promise<WarehouseLocation[]> {
  try {
    const suffix = available ? '/available' : ''
    const rows = await request<Row[]>({ url: `/api/wms/warehouses/${warehouseId}/locations${suffix}` })
    return rows.map(adaptLocation)
  } catch (error) {
    if (shouldUseMock(error)) {
      return [{ id: `${warehouseId}-LOC-A01`, warehouseId: String(warehouseId), locationCode: 'A-01-01', zone: 'A区', isOccupied: 0, status: 1 }]
    }
    throw error
  }
}

export async function fetchOutboundOrders(params: PageParams): Promise<PageResult<OutboundOrder>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, outboundStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/outbound', params: query }), adaptOutbound, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, outboundStatusText)
      return pageOf(outboundOrders.filter((item) => (!keyword || item.outboundNo.includes(keyword) || item.orderNo.includes(keyword) || item.warehouse.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function fetchStocktakeTasks(params: PageParams): Promise<PageResult<StocktakeTask>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, stocktakeStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/wms/stocktake', params: query }), adaptStocktake, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, stocktakeStatusText)
      return pageOf(stocktakeTasks.filter((item) => (!keyword || item.taskNo.includes(keyword) || item.type.includes(keyword) || item.warehouse.includes(keyword)) && (!status || item.status === status)), params.pageNum, params.pageSize)
    }
    throw error
  }
}

export async function fetchStocktakeItems(id: string | number): Promise<StocktakeItem[]> {
  try {
    const rows = await request<Row[]>({ url: `/api/wms/stocktake/${id}/items` })
    return rows.map(adaptStocktakeItem)
  } catch (error) {
    if (shouldUseMock(error)) return []
    throw error
  }
}

export async function countStocktake(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/wms/stocktake/${id}/count`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function auditStocktake(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/wms/stocktake/${id}/audit`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function confirmInbound(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/wms/inbound/${id}/confirm`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function confirmOutbound(id: string | number) {
  try {
    return await request<void>({ url: `/api/wms/outbound/${id}/confirm`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}
