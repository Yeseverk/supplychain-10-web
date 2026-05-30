import type {
  Bill,
  CashFlowRow,
  DashboardData,
  InboundOrder,
  InventoryItem,
  InventoryLog,
  KpiMetric,
  LogisticsChannel,
  Order,
  OutboundOrder,
  PageResult,
  Payable,
  ProductCategory,
  ProductSku,
  ProductSpu,
  ProfitRow,
  PurchaseInquiry,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseRequisition,
  Refund,
  ReorderSuggestion,
  Supplier,
  Waybill,
  Warehouse,
} from '../types'

export function pageOf<T>(records: T[], pageNum = 1, pageSize = 20): PageResult<T> {
  const start = (pageNum - 1) * pageSize
  return {
    pageNum,
    pageSize,
    current: pageNum,
    size: pageSize,
    total: records.length,
    pages: Math.max(1, Math.ceil(records.length / pageSize)),
    records: records.slice(start, start + pageSize),
  }
}

export const demoUser = {
  tokenName: 'Authorization',
  tokenValue: 'mock-token',
  userId: '2059984037695041538',
  tenantId: '2059984036520636418',
  tenantCode: 'TC-20260528-7012',
  username: 'admin@flexchain.local',
  realName: '租户管理员',
  planType: 2,
  roles: ['ROLE_TENANT_ADMIN', 'ROLE_PURCHASE_MANAGER'],
  permissions: ['*'],
  planFeatures: ['*'],
}

export const suppliers: Supplier[] = [
  { id: '910000000000000101', supplierCode: 'SUP-001', supplierName: '深圳星河电子有限公司', supplierType: '工厂', contactName: '陈经理', contactPhone: '13888886666', province: '广东', city: '深圳', grade: 'S', score: 96, status: '已通过', qualificationWarning: false, createdAt: '2026-05-20' },
  { id: '910000000000000102', supplierCode: 'SUP-002', supplierName: '义乌蓝海贸易有限公司', supplierType: '贸易商', contactName: '李主管', contactPhone: '13977775555', province: '浙江', city: '义乌', grade: 'A', score: 88, status: '待审核', qualificationWarning: true, createdAt: '2026-05-22' },
  { id: '910000000000000103', supplierCode: 'SUP-003', supplierName: '东莞速达包装制品厂', supplierType: '工厂', contactName: '王厂长', contactPhone: '13766664444', province: '广东', city: '东莞', grade: 'B', score: 78, status: '正常', qualificationWarning: false, createdAt: '2026-05-24' },
]

export const categories: ProductCategory[] = [
  { id: '1', name: '消费电子', status: '正常' },
  { id: '2', name: '家居用品', status: '正常' },
]

export const spus: ProductSpu[] = [
  { id: '910000000000000301', spuCode: 'SPU-BT-HEADSET', spuName: '蓝牙降噪耳机 Pro', categoryName: '消费电子', status: '已上架', skuCount: 2, createdAt: '2026-05-21' },
  { id: '910000000000000302', spuCode: 'SPU-LED-LAMP', spuName: '便携 LED 露营灯', categoryName: '家居用品', status: '草稿', skuCount: 3, createdAt: '2026-05-23' },
]

export const skus: ProductSku[] = [
  { id: '910000000000000401', skuCode: 'SKU-BT-BLACK', skuName: '蓝牙降噪耳机 Pro 黑色', spuName: '蓝牙降噪耳机 Pro', spec: '黑色/欧规', status: '正常', salePrice: 49.9, currency: 'USD' },
  { id: '910000000000000402', skuCode: 'SKU-LAMP-GREEN', skuName: '便携 LED 露营灯 绿色', spuName: '便携 LED 露营灯', spec: '绿色/USB-C', status: '正常', salePrice: 29.9, currency: 'USD' },
]

export const purchaseRequisitions: PurchaseRequisition[] = [
  { id: '910000000000000601', reqNo: 'REQ-202605-001', title: '蓝牙耳机安全库存补货', applicantName: '采购专员', status: '已通过', amount: 58000, createdAt: '2026-05-25' },
  { id: '910000000000000602', reqNo: 'REQ-202605-002', title: '露营灯旺季备货', applicantName: '运营经理', status: '待审核', amount: 32000, createdAt: '2026-05-26' },
]

export const purchaseInquiries: PurchaseInquiry[] = [
  { id: '910000000000000651', inquiryNo: 'INQ-202605-001', supplierName: '深圳星河电子有限公司', status: '已报价', deadline: '2026-06-03', quotedCount: 3 },
  { id: '910000000000000652', inquiryNo: 'INQ-202605-002', supplierName: '义乌蓝海贸易有限公司', status: '待报价', deadline: '2026-06-05', quotedCount: 1 },
]

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: '910000000000000701',
    orderNo: 'PO-202605-001',
    supplierName: '深圳星河电子有限公司',
    supplierType: '工厂',
    currency: 'CNY',
    totalAmount: 58000,
    rmbAmount: 58000,
    status: '发货中',
    warehouse: '宁波国内仓',
    expectedArrivalDate: '2026-06-04',
    overdue: false,
    createdAt: '2026-05-26',
    items: [{ skuCode: 'SKU-BT-BLACK', name: '蓝牙降噪耳机 Pro 黑色', spec: '黑色/欧规', quantity: 500, receivedQuantity: 200, unitPrice: 116 }],
    receipts: [{ id: '1', receiptNo: 'RCV-202605-001', receivedAt: '2026-05-28', operator: '仓储主管', quantity: 200 }],
    timeline: [
      { time: '2026-05-26 09:30', title: '创建采购单', operator: '采购专员' },
      { time: '2026-05-27 14:10', title: '供应商确认接单', operator: '陈经理' },
      { time: '2026-05-28 16:20', title: '部分到货入库', operator: '仓储主管' },
    ],
    payable: { amount: 58000, dueDate: '2026-06-28', status: '待对账' },
  },
  {
    id: '910000000000000702',
    orderNo: 'PO-202605-002',
    supplierName: '义乌蓝海贸易有限公司',
    supplierType: '贸易商',
    currency: 'CNY',
    totalAmount: 32000,
    rmbAmount: 32000,
    status: '待供应商确认',
    warehouse: '洛杉矶海外仓',
    expectedArrivalDate: '2026-06-08',
    overdue: false,
    createdAt: '2026-05-27',
    items: [{ skuCode: 'SKU-LAMP-GREEN', name: '便携 LED 露营灯 绿色', spec: '绿色/USB-C', quantity: 400, receivedQuantity: 0, unitPrice: 80 }],
    receipts: [],
    timeline: [{ time: '2026-05-27 11:00', title: '创建采购单', operator: '采购专员' }],
    payable: { amount: 32000, dueDate: '2026-07-08', status: '未生成' },
  },
]

export const purchaseReceipts: PurchaseReceipt[] = [
  { id: '910000000000000751', receiptNo: 'RCV-202605-001', poNo: 'PO-202605-001', warehouseName: '宁波国内仓', status: '已完成', totalQty: 200, actualQty: 200, createdAt: '2026-05-28' },
  { id: '910000000000000752', receiptNo: 'RCV-202605-002', poNo: 'PO-202605-002', warehouseName: '洛杉矶海外仓', status: '待入库', totalQty: 400, actualQty: 0, createdAt: '2026-05-29' },
]

export const warehouses: Warehouse[] = [
  { id: '910000000000000501', warehouseCode: 'US-LAX-01', warehouseName: '洛杉矶海外仓', city: 'Los Angeles', status: '正常' },
  { id: '910000000000000502', warehouseCode: 'CN-NB-01', warehouseName: '宁波国内仓', city: '宁波', status: '正常' },
  { id: '910000000000000503', warehouseCode: 'DE-HAM-01', warehouseName: '汉堡欧洲仓', city: 'Hamburg', status: '正常' },
]

export const inventoryItems: InventoryItem[] = [
  { id: '1', warehouseId: '910000000000000502', skuId: '910000000000000401', skuCode: 'SKU-BT-BLACK', skuName: '蓝牙降噪耳机 Pro 黑色', spec: '黑色/欧规', warehouse: '宁波国内仓', physicalQty: 320, availableQty: 260, frozenQty: 40, inboundQty: 300, defectiveQty: 20, safetyQty: 200, warningStatus: 'normal', lastInboundAt: '2026-05-28' },
  { id: '2', warehouseId: '910000000000000501', skuId: '910000000000000402', skuCode: 'SKU-LAMP-GREEN', skuName: '便携 LED 露营灯 绿色', spec: '绿色/USB-C', warehouse: '洛杉矶海外仓', physicalQty: 42, availableQty: 18, frozenQty: 12, inboundQty: 400, defectiveQty: 0, safetyQty: 120, warningStatus: 'low', lastInboundAt: '2026-05-21' },
  { id: '3', warehouseId: '910000000000000503', skuId: '910000000000000401', skuCode: 'SKU-BT-BLACK', skuName: '蓝牙降噪耳机 Pro 黑色', spec: '黑色/欧规', warehouse: '汉堡欧洲仓', physicalQty: 0, availableQty: 0, frozenQty: 0, inboundQty: 160, defectiveQty: 0, safetyQty: 80, warningStatus: 'zero', lastInboundAt: '-' },
]

export const inventoryLogs: InventoryLog[] = [
  { id: '1', skuCode: 'SKU-BT-BLACK', warehouse: '宁波国内仓', type: '采购入库', changeQty: 200, beforeQty: 120, afterQty: 320, operator: '仓储主管', operatedAt: '2026-05-28 16:20', remark: '采购单 PO-202605-001 部分到货' },
  { id: '2', skuCode: 'SKU-LAMP-GREEN', warehouse: '洛杉矶海外仓', type: '销售出库', changeQty: -12, beforeQty: 54, afterQty: 42, operator: '系统', operatedAt: '2026-05-28 18:40', remark: 'Amazon 订单出库' },
]

export const inboundOrders: InboundOrder[] = [
  { id: '910000000000000801', inboundNo: 'IN-202605-001', sourceNo: 'PO-202605-001', warehouse: '宁波国内仓', status: '入库中', skuCount: 1, plannedQty: 500, receivedQty: 200, createdAt: '2026-05-28' },
  { id: '910000000000000802', inboundNo: 'IN-202605-002', sourceNo: 'PO-202605-002', warehouse: '洛杉矶海外仓', status: '待入库', skuCount: 1, plannedQty: 400, receivedQty: 0, createdAt: '2026-05-29' },
]

export const outboundOrders: OutboundOrder[] = [
  { id: '910000000000000851', outboundNo: 'OUT-202605-001', orderNo: 'SO-202605-001', warehouse: '洛杉矶海外仓', status: '待拣货', plannedQty: 2, shippedQty: 0, createdAt: '2026-05-29' },
  { id: '910000000000000852', outboundNo: 'OUT-202605-002', orderNo: 'SO-202605-002', warehouse: '宁波国内仓', status: '已出库', plannedQty: 1, shippedQty: 1, createdAt: '2026-05-28' },
]

export const stocktakeTasks = [
  { id: '910000000000000901', taskNo: 'STK-202605-001', type: '循环盘点', warehouse: '宁波国内仓', status: '待审核差异', progress: 100, profitQty: 4, lossQty: 1, createdAt: '2026-05-28' },
  { id: '910000000000000902', taskNo: 'STK-202605-002', type: '动销盘点', warehouse: '洛杉矶海外仓', status: '盘点中', progress: 60, profitQty: 0, lossQty: 0, createdAt: '2026-05-29' },
]

export const orders: Order[] = [
  { id: '910000000000001001', orderNo: 'SO-202605-001', platformOrderNo: 'AMZ-8899123', platform: 'Amazon', buyerCountry: 'US', amount: 99.8, currency: 'USD', status: '待发货', warehouse: '洛杉矶海外仓', deliveryDeadline: '2026-05-30 18:00', abnormal: true },
  { id: '910000000000001002', orderNo: 'SO-202605-002', platformOrderNo: 'TT-778812', platform: 'TikTok', buyerCountry: 'DE', amount: 49.9, currency: 'EUR', status: '已发货', warehouse: '汉堡欧洲仓', deliveryDeadline: '2026-05-31 18:00' },
]

export const refunds: Refund[] = [
  { id: '1', refundNo: 'RF-202605-001', orderNo: 'SO-202605-002', refundType: '仅退款', amount: 12.5, status: '待审核', reason: '买家反馈配件缺失' },
]

export const waybills: Waybill[] = [
  { id: '910000000000001101', waybillNo: 'WB-202605-001', trackingNo: '1Z999AA101', carrierName: 'DHL', channelName: 'DHL Packet Plus', orderNo: 'SO-202605-001', countryCode: 'US', status: '运输中', currentTrack: '洛杉矶分拨中心已出库', fee: 8.6, createdAt: '2026-05-29' },
  { id: '910000000000001102', waybillNo: 'WB-202605-002', trackingNo: 'YT252001', carrierName: '燕文物流', channelName: '欧洲专线', orderNo: 'SO-202605-002', countryCode: 'DE', status: '异常', currentTrack: '超过 7 天无轨迹更新', fee: 6.2, createdAt: '2026-05-23' },
]

export const logisticsChannels: LogisticsChannel[] = [
  { id: '1', channelName: 'DHL Packet Plus', carrierName: 'DHL', countryCodes: 'US,CA,MX', status: '正常' },
  { id: '2', channelName: '欧洲专线', carrierName: '燕文物流', countryCodes: 'DE,FR,IT,ES', status: '正常' },
]

export const payables: Payable[] = [
  { id: '910000000000001201', payableNo: 'AP-202605-001', sourceBizNo: 'PO-202605-001', supplierName: '深圳星河电子有限公司', amount: 58000, paidAmount: 0, currency: 'CNY', dueDate: '2026-06-28', status: '待对账', overdueDays: 0 },
  { id: '910000000000001202', payableNo: 'AP-202605-002', sourceBizNo: 'PO-202604-009', supplierName: '东莞速达包装制品厂', amount: 12600, paidAmount: 12600, currency: 'CNY', dueDate: '2026-05-26', status: '已结清', overdueDays: 0 },
]

export const bills: Bill[] = [
  { id: '1', billNo: 'BILL-AMZ-202605', platform: 'Amazon', storeName: 'Flex-US', netAmount: 18600, currency: 'USD', status: '待对账', importedAt: '2026-05-28' },
  { id: '2', billNo: 'BILL-TT-202605', platform: 'TikTok', storeName: 'Flex-EU', netAmount: 7200, currency: 'EUR', status: '有差异', importedAt: '2026-05-27' },
]

export const profits: ProfitRow[] = [
  { id: '1', skuCode: 'SKU-BT-BLACK', platform: 'Amazon', gmv: 19800, purchaseCost: 5800, logisticsFee: 1240, platformFee: 2460, netProfit: 7200, netMargin: 36.4 },
  { id: '2', skuCode: 'SKU-LAMP-GREEN', platform: 'TikTok', gmv: 9200, purchaseCost: 3200, logisticsFee: 860, platformFee: 1100, netProfit: 2100, netMargin: 22.8 },
]

export const cashFlows: CashFlowRow[] = [
  { id: '1', flowDate: '2026-05-29', flowType: '收入', sourceNo: 'BILL-AMZ-202605', amount: 133920, remark: 'Amazon 结算到账' },
  { id: '2', flowDate: '2026-05-30', flowType: '支出', sourceNo: 'AP-202605-001', amount: -58000, remark: '采购应付预计付款' },
]

export const kpiMetrics: KpiMetric[] = [
  { id: '1', name: '库存周转率', value: 4.8, target: 5, unit: '次/月', status: '未达标' },
  { id: '2', name: '订单 OTD 率', value: 96.2, target: 95, unit: '%', status: '达标' },
  { id: '3', name: '供应商准时率', value: 91.5, target: 90, unit: '%', status: '达标' },
  { id: '4', name: '缺货率', value: 2.1, target: 3, unit: '%', status: '达标' },
]

export const reorderSuggestions: ReorderSuggestion[] = [
  { id: '1', skuCode: 'SKU-LAMP-GREEN', skuName: '便携 LED 露营灯 绿色', availableQty: 18, forecastDailySales: 14, suggestedQty: 360, urgency: '紧急' },
  { id: '2', skuCode: 'SKU-BT-BLACK', skuName: '蓝牙降噪耳机 Pro 黑色', availableQty: 260, forecastDailySales: 36, suggestedQty: 500, urgency: '较急' },
]

export const messages = [
  { id: '1', title: '采购单即将到货', content: 'PO-202605-001 预计 6 月 4 日到达宁波国内仓。', type: '业务通知', readStatus: 0, createdAt: '2026-05-29 09:00' },
  { id: '2', title: '库存预警', content: 'SKU-LAMP-GREEN 洛杉矶仓可售库存低于安全库存。', type: '告警', readStatus: 0, createdAt: '2026-05-29 10:20' },
]

export const dashboardData: DashboardData = {
  dataSource: 'mock',
  kpis: [
    { title: '本月 GMV', value: 286000, unit: 'CNY', change: 12.5, permission: 'oms:order:list' },
    { title: '净利润', value: 56300, unit: 'CNY', change: 8.2, permission: 'fms:profit:view' },
    { title: '订单量', value: 1286, change: 18.6, permission: 'oms:order:list' },
    { title: '库存总价值', value: 468000, unit: 'CNY', change: -3.1, permission: 'wms:inventory:list' },
  ],
  salesTrend: [
    { date: '05-23', gmv: 31600, profit: 6200, orders: 138 },
    { date: '05-24', gmv: 34800, profit: 6900, orders: 142 },
    { date: '05-25', gmv: 39500, profit: 7600, orders: 166 },
    { date: '05-26', gmv: 42100, profit: 8100, orders: 180 },
    { date: '05-27', gmv: 38200, profit: 7300, orders: 154 },
    { date: '05-28', gmv: 45600, profit: 8800, orders: 194 },
    { date: '05-29', gmv: 49700, profit: 9400, orders: 212 },
  ],
  platformShare: [
    { name: 'Amazon', value: 56 },
    { name: 'TikTok', value: 28 },
    { name: 'Shopee', value: 16 },
  ],
  stockWarnings: inventoryItems.filter((item) => item.warningStatus !== 'normal'),
  todos: [
    { id: 'todo-1', title: '处理 2 张待确认采购单', module: 'PMS', priority: 'medium', deadline: '今天', permission: 'pms:order:manage' },
    { id: 'todo-2', title: '复核洛杉矶仓低库存 SKU', module: 'WMS', priority: 'high', deadline: '今天', permission: 'wms:inventory:list' },
    { id: 'todo-3', title: '审核 1 笔退款申请', module: 'OMS', priority: 'medium', deadline: '明天', permission: 'oms:refund:audit' },
  ],
}
