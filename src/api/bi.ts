import { dashboardData, kpiMetrics, pageOf, reorderSuggestions } from '../data/mock'
import type { DashboardData, InventoryItem, KpiMetric, PageParams, PageResult, PurchaseOrder, ReorderSuggestion, StocktakeTask, TodoItem } from '../types'
import { useAuthStore } from '../store/auth'
import { request, shouldUseMock } from './request'
import { fetchPurchaseOrders } from './pms'
import { fetchInboundOrders, fetchInventory, fetchStocktakeTasks } from './wms'

type PmsOverview = Partial<{ orderCount: number | string; purchaseAmount: number }>
type WmsOverview = Partial<{ available: number; inventoryValue: number }>
type OmsOverview = Partial<{ gmv: number; orderCount: number }>

function buildTodos(orders: PurchaseOrder[], inboundCount: number, stocktakes: StocktakeTask[], unreadCount: number): TodoItem[] {
  const todos: TodoItem[] = []
  const pendingOrder = orders.find((item) => ['待供应商确认', '已确认', '发货中', '部分到货'].includes(item.status))

  if (pendingOrder) {
    todos.push({
      id: `po-${pendingOrder.orderNo}`,
      title: `跟进采购单 ${pendingOrder.orderNo}`,
      module: 'PMS',
      priority: pendingOrder.overdue ? 'high' : 'medium',
      deadline: pendingOrder.expectedArrivalDate,
      permission: 'pms:order:manage',
    })
  }

  if (inboundCount > 0) {
    todos.push({ id: 'wms-inbound', title: `处理 ${inboundCount} 张入库单`, module: 'WMS', priority: 'medium', deadline: '今天', permission: 'wms:inbound:manage' })
  }

  const auditTask = stocktakes.find((item) => item.status === '待审核差异')
  if (auditTask) {
    todos.push({
      id: `stocktake-${auditTask.taskNo}`,
      title: `复核盘点差异 ${auditTask.taskNo}`,
      module: 'WMS',
      priority: 'high',
      deadline: auditTask.createdAt,
      permission: 'wms:stocktake:audit',
    })
  }

  if (unreadCount > 0) {
    todos.push({ id: 'message-unread', title: `查看 ${unreadCount} 条未读消息`, module: 'System', priority: unreadCount >= 3 ? 'high' : 'low', deadline: '实时' })
  }

  return todos
}

async function softRequest<T>(config: Parameters<typeof request<T>>[0], fallback: T): Promise<T> {
  try {
    return await request<T>(config)
  } catch (error) {
    if (shouldUseMock(error)) return fallback
    throw error
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const { hasPermission } = useAuthStore.getState()
    const canPms = hasPermission('pms:order:list')
    const canWmsInventory = hasPermission('wms:inventory:list')
    const canWmsInbound = hasPermission('wms:inbound:list')
    const canWmsStocktake = hasPermission('wms:stocktake:list')
    const canOms = hasPermission('oms:order:list')
    const canMessages = hasPermission('system:message:manage')

    const [pmsOverview, wmsOverview, omsOverview, purchasePage, inventoryPage, inboundPage, stocktakePage, unreadCount] = await Promise.all([
      canPms ? softRequest<PmsOverview>({ url: '/api/pms/report/overview' }, {}) : Promise.resolve({} as PmsOverview),
      canWmsInventory ? softRequest<WmsOverview>({ url: '/api/wms/report/overview' }, {}) : Promise.resolve({} as WmsOverview),
      canOms ? softRequest<OmsOverview>({ url: '/api/oms/report/overview' }, {}) : Promise.resolve({} as OmsOverview),
      canPms ? fetchPurchaseOrders({ pageNum: 1, pageSize: 20 }).catch((error) => {
        if (shouldUseMock(error)) return pageOf([] as PurchaseOrder[], 1, 20)
        throw error
      }) : Promise.resolve(pageOf([] as PurchaseOrder[], 1, 20)),
      canWmsInventory ? fetchInventory({ pageNum: 1, pageSize: 20 }).catch((error) => {
        if (shouldUseMock(error)) return pageOf([] as InventoryItem[], 1, 20)
        throw error
      }) : Promise.resolve(pageOf([] as InventoryItem[], 1, 20)),
      canWmsInbound ? fetchInboundOrders({ pageNum: 1, pageSize: 20 }).catch((error) => {
        if (shouldUseMock(error)) return pageOf([], 1, 20)
        throw error
      }) : Promise.resolve(pageOf([], 1, 20)),
      canWmsStocktake ? fetchStocktakeTasks({ pageNum: 1, pageSize: 20 }).catch((error) => {
        if (shouldUseMock(error)) return pageOf([] as StocktakeTask[], 1, 20)
        throw error
      }) : Promise.resolve(pageOf([] as StocktakeTask[], 1, 20)),
      canMessages ? softRequest<number | string>({ url: '/api/messages/unread-count' }, 0) : Promise.resolve(0),
    ])

    const stockWarnings: InventoryItem[] = inventoryPage.records.filter((item) => item.warningStatus !== 'normal')
    const hasRealSummary = Boolean(pmsOverview.orderCount || pmsOverview.purchaseAmount || wmsOverview.inventoryValue || omsOverview.gmv)

    return {
      ...dashboardData,
      dataSource: hasRealSummary ? 'real' : 'mock',
      kpis: [
        { title: '本月 GMV', value: Number(omsOverview.gmv || dashboardData.kpis[0].value), unit: 'CNY', change: 12.5, permission: 'oms:order:list' },
        { title: '采购总额', value: Number(pmsOverview.purchaseAmount || dashboardData.kpis[1]?.value || 0), unit: 'CNY', change: 0, permission: 'pms:order:list' },
        { title: '采购单数', value: Number(pmsOverview.orderCount || purchasePage.total || dashboardData.kpis[2]?.value || 0), change: 0, permission: 'pms:order:list' },
        { title: '库存总价值', value: Number(wmsOverview.inventoryValue || dashboardData.kpis[3]?.value || 0), unit: 'CNY', change: 0, permission: 'wms:inventory:list' },
      ],
      stockWarnings: stockWarnings.length ? stockWarnings : dashboardData.stockWarnings,
      todos: buildTodos(purchasePage.records, inboundPage.total || 0, stocktakePage.records, Number(unreadCount || 0)),
    }
  } catch (error) {
    if (shouldUseMock(error)) return dashboardData
    throw error
  }
}

export async function fetchKpiMetrics(params: PageParams): Promise<PageResult<KpiMetric>> {
  try {
    const data = await request<KpiMetric[] | PageResult<KpiMetric> | Record<string, unknown>>({ url: '/api/bi/kpi/dashboard', params })
    if (Array.isArray(data)) return pageOf(data, params.pageNum, params.pageSize)
    if ('records' in data) return data as PageResult<KpiMetric>
    return pageOf(kpiObjectToRows(data), params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(kpiMetrics, params.pageNum, params.pageSize)
    throw error
  }
}

function kpiObjectToRows(data: Record<string, unknown>): KpiMetric[] {
  const labels: Record<string, { name: string; target: number; unit: string; higherBetter?: boolean }> = {
    netMargin: { name: 'SKU 净利率', target: 20, unit: '%' },
    logisticsExceptionRate: { name: '物流异常率', target: 3, unit: '%', higherBetter: false },
    otdRate: { name: '订单 OTD 率', target: 95, unit: '%' },
    stockoutRate: { name: '缺货率', target: 5, unit: '%', higherBetter: false },
    inventoryTurnover: { name: '库存周转率', target: 6, unit: '次' },
    purchaseArrivalRate: { name: '采购准时到货率', target: 95, unit: '%' },
    refundRate: { name: '退款率', target: 3, unit: '%', higherBetter: false },
    supplierOntimeRate: { name: '供应商准时率', target: 95, unit: '%' },
  }

  return Object.entries(data).map(([key, raw]) => {
    const meta = labels[key] || { name: key, target: 0, unit: '' }
    const value = Number(raw || 0)
    const passed = meta.higherBetter === false ? value <= meta.target : value >= meta.target
    return {
      id: key,
      name: meta.name,
      value,
      target: meta.target,
      unit: meta.unit,
      status: passed ? '达标' : '未达标',
    }
  })
}

export async function fetchReorderSuggestions(params: PageParams): Promise<PageResult<ReorderSuggestion>> {
  try {
    const data = await request<ReorderSuggestion[] | PageResult<ReorderSuggestion>>({ url: '/api/bi/reorder/suggestions', params })
    return Array.isArray(data) ? pageOf(data, params.pageNum, params.pageSize) : data
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(reorderSuggestions, params.pageNum, params.pageSize)
    throw error
  }
}

export async function convertReorderToPurchase(suggestion?: Pick<ReorderSuggestion, 'skuCode' | 'skuName' | 'availableQty' | 'forecastDailySales' | 'suggestedQty' | 'urgency'> & { skuId?: string | number }) {
  try {
    return await request<Record<string, unknown>>({ url: '/api/bi/reorder/to-purchase', method: 'post', data: suggestion })
  } catch (error) {
    if (shouldUseMock(error)) return {}
    throw error
  }
}
