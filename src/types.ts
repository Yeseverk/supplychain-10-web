import type { ReactNode } from 'react'

export type ApiResponse<T = unknown> = {
  code: number
  msg: string
  data: T
  timestamp?: number
  traceId?: string
}

export type PageResult<T> = {
  pageNum?: number
  pageSize?: number
  current?: number
  size?: number
  total: number
  pages: number
  records: T[]
}

export type PageParams = {
  pageNum: number
  pageSize: number
  keyword?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  status?: string | number
  [key: string]: unknown
}

export type AuthUser = {
  tokenName: string
  tokenValue: string
  refreshToken?: string
  userId: number | string
  tenantId: number | string
  tenantCode: string
  username: string
  realName: string
  planType?: number
  roles: string[]
  permissions: string[]
  planFeatures: string[]
}

export type RouteMenuItem = {
  key: string
  label: string
  path?: string
  icon?: ReactNode
  permission?: string
  planFeature?: string
  children?: RouteMenuItem[]
}

export type KpiItem = {
  title: string
  value: number
  unit?: string
  change: number
  permission?: string
}

export type TodoItem = {
  id: string
  title: string
  module: 'SRM' | 'PIM' | 'PMS' | 'WMS' | 'OMS' | 'TMS' | 'FMS' | 'BI' | 'System'
  priority: 'high' | 'medium' | 'low'
  deadline: string
  permission?: string
}

export type DashboardData = {
  kpis: KpiItem[]
  salesTrend: Array<{ date: string; gmv: number; profit: number; orders: number }>
  platformShare: Array<{ name: string; value: number }>
  stockWarnings: InventoryItem[]
  todos: TodoItem[]
  dataSource?: 'real' | 'mock'
}

export type TimelineRecord = {
  time: string
  title: string
  operator: string
}

export type Supplier = {
  id: string
  version?: number
  supplierCode: string
  supplierName: string
  supplierType: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  province?: string
  city?: string
  currency?: string
  leadTimeDays?: number
  remark?: string
  grade: string
  score: number
  status: string
  qualificationWarning?: boolean
  createdAt?: string
}

export type SupplierCert = {
  id: string
  certName: string
  certType: string
  expireDate: string
  status: string
}

export type SupplierContact = {
  id: string
  name: string
  phone: string
  email?: string
  position?: string
}

export type ProductCategory = {
  id: string
  name: string
  parentId?: string
  status?: string
}

export type ProductSpu = {
  id: string
  spuCode: string
  spuName: string
  categoryId?: string
  categoryName: string
  categoryPath?: string
  brand?: string
  originCountry?: string
  material?: string
  spuDesc?: string
  packageDesc?: string
  status: string
  skuCount: number
  createdAt?: string
}

export type ProductSku = {
  id: string
  skuCode: string
  skuName: string
  spuName?: string
  spec?: string
  status: string
  salePrice?: number
  currency?: string
}

export type PurchaseRequisition = {
  id: string
  reqNo: string
  title: string
  applicantName: string
  status: string
  amount: number
  createdAt: string
}

export type PurchaseInquiry = {
  id: string
  inquiryNo: string
  supplierName: string
  status: string
  deadline: string
  quotedCount: number
}

export type PurchaseOrder = {
  id: string
  orderNo: string
  supplierName: string
  supplierType: string
  currency: string
  totalAmount: number
  rmbAmount: number
  status: string
  warehouse: string
  expectedArrivalDate: string
  overdue: boolean
  createdAt: string
  items: PurchaseOrderItem[]
  receipts: ReceiptRecord[]
  timeline: TimelineRecord[]
  payable: PayableSummary
}

export type PurchaseOrderItem = {
  id?: string
  skuCode: string
  name: string
  spec: string
  quantity: number
  receivedQuantity: number
  unitPrice: number
}

export type PurchaseReceipt = {
  id: string
  receiptNo: string
  poNo: string
  warehouseName: string
  status: string
  totalQty: number
  actualQty: number
  createdAt: string
}

export type ReceiptRecord = {
  id: string
  receiptNo: string
  receivedAt: string
  operator: string
  quantity: number
}

export type PayableSummary = {
  amount: number
  dueDate: string
  status: string
}

export type Warehouse = {
  id: string
  warehouseCode: string
  warehouseName: string
  warehouseType?: number
  countryCode?: string
  countryName?: string
  province?: string
  city?: string
  address?: string
  zipCode?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  areaSqm?: number
  isDefault?: number
  status: string
  remark?: string
}

export type InventoryItem = {
  id: string
  warehouseId?: string
  skuId?: string
  skuCode: string
  skuName: string
  spec: string
  warehouse: string
  physicalQty: number
  availableQty: number
  frozenQty: number
  inboundQty: number
  defectiveQty: number
  safetyQty: number
  warningStatus: 'normal' | 'tight' | 'low' | 'zero'
  lastInboundAt: string
}

export type InventoryLog = {
  id: string
  skuCode: string
  warehouse: string
  type: string
  changeQty: number
  beforeQty: number
  afterQty: number
  operator: string
  operatedAt: string
  remark: string
}

export type InboundOrder = {
  id: string
  inboundNo: string
  sourceNo: string
  warehouseId?: string
  warehouse: string
  status: string
  skuCount: number
  plannedQty: number
  receivedQty: number
  createdAt: string
}

export type InboundOrderItem = {
  id: string
  skuId: string
  skuCode: string
  skuName: string
  expectedQty: number
  actualQty: number
  defectiveQty: number
  locationId?: string
  locationCode?: string
  unitCost?: number
  remark?: string
}

export type OutboundOrder = {
  id: string
  outboundNo: string
  orderNo: string
  warehouse: string
  status: string
  plannedQty: number
  shippedQty: number
  createdAt: string
}

export type WarehouseLocation = {
  id: string
  warehouseId: string
  locationCode: string
  zone?: string
  isOccupied?: number
  status?: number
}

export type StocktakeTask = {
  id: string
  taskNo: string
  type: string
  warehouse: string
  status: string
  progress: number
  profitQty: number
  lossQty: number
  createdAt: string
}

export type StocktakeItem = {
  id: string
  warehouseId: string
  locationId?: string
  locationCode?: string
  skuId: string
  skuCode: string
  skuName: string
  bookQty: number
  actualQty?: number
  diffQty?: number
  diffReason?: string
  isAdjusted?: number
}

export type Order = {
  id: string
  orderNo: string
  platformOrderNo: string
  platform: string
  buyerCountry: string
  amount: number
  currency: string
  status: string
  warehouse: string
  deliveryDeadline: string
  abnormal?: boolean
}

export type OrderItem = {
  skuCode: string
  skuName: string
  quantity: number
  amount: number
}

export type Refund = {
  id: string
  refundNo: string
  orderNo: string
  refundType: string
  amount: number
  status: string
  reason: string
}

export type Waybill = {
  id: string
  waybillNo: string
  trackingNo: string
  carrierName: string
  channelName: string
  orderNo: string
  countryCode: string
  status: string
  currentTrack: string
  fee: number
  feeCurrency?: string
  createdAt: string
}

export type TrackNode = {
  time: string
  location: string
  description: string
  exception?: boolean
}

export type LogisticsChannel = {
  id: string
  channelName: string
  carrierName: string
  countryCodes: string
  status: string
}

export type Payable = {
  id: string
  payableNo: string
  sourceBizNo: string
  supplierName: string
  amount: number
  paidAmount: number
  currency: string
  dueDate: string
  status: string
  overdueDays: number
}

export type Bill = {
  id: string
  billNo: string
  platform: string
  storeName: string
  netAmount: number
  currency: string
  status: string
  importedAt: string
}

export type BillItem = {
  id: string
  itemType: string
  orderNo: string
  platformSku: string
  amount: number
  currency: string
  description: string
  transactionDate: string
  isMatched: string
}

export type PaymentRecord = {
  id: string
  payableId: string
  paymentAmount: number
  paymentDate: string
  paymentMethod: string
  voucherNo: string
  operatorName: string
  remark: string
  createdAt: string
}

export type ProfitRow = {
  id: string
  skuCode: string
  platform: string
  gmv: number
  purchaseCost: number
  logisticsFee: number
  platformFee: number
  netProfit: number
  netMargin: number
}

export type CashFlowRow = {
  id: string
  flowDate: string
  flowType: string
  sourceNo: string
  amount: number
  remark?: string
}

export type KpiMetric = {
  id: string
  name: string
  value: number
  target: number
  unit: string
  status: string
}

export type ReorderSuggestion = {
  id: string
  skuCode: string
  skuName: string
  availableQty: number
  forecastDailySales: number
  suggestedQty: number
  urgency: string
}
