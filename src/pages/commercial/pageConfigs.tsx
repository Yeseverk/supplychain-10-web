import { Progress, Space, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { convertReorderToPurchase, fetchKpiMetrics, fetchReorderSuggestions } from '../../api/bi'
import { applyPayable, approvePayable, confirmBill, fetchBillItems, fetchBills, fetchCashFlows, fetchPayablePayments, fetchPayables, fetchProfits, markPayablePaid, parseBill, uploadBill } from '../../api/fms'
import { approveOrder, auditRefund, cancelOrder, completeRefund, fetchOrderDetail, fetchOrderLogs, fetchOrders, fetchRefunds, flagOrder, markRefundReceived, syncOrder } from '../../api/oms'
import { batchCreateSkus, createSpu, fetchSkuDetail, fetchSkus, fetchSpuDetail, fetchSpus, publishSpu, updateSkuPrice, updateSpu } from '../../api/pim'
import { auditPurchaseRequisition, cancelPurchaseOrder, comparePurchaseInquiry, confirmPurchaseOrder, confirmPurchaseReceipt, createPurchaseOrder, createPurchaseReceipt, createPurchaseRequisition, fetchPurchaseInquiries, fetchPurchaseOrderDetail, fetchPurchaseOrders, fetchPurchaseReceipts, fetchPurchaseRequisitionDetail, fetchPurchaseRequisitions, markPurchaseOrderShipping, reconcilePurchaseOrder, selectPurchaseInquiry, submitPurchaseRequisition, urgePurchaseOrder } from '../../api/pms'
import { auditSupplier, createSupplier, disableSupplier, enableSupplier, fetchSupplierDetail, fetchSuppliers, requestSupplierSupplement, updateSupplier } from '../../api/srm'
import { cancelWaybill, createLogisticsChannel, createWaybill, disableLogisticsChannel, fetchLogisticsChannels, fetchWaybillTracks, fetchWaybills, refreshWaybillTracks, updateWaybillStatus } from '../../api/tms'
import { adjustInventory, auditStocktake, confirmInbound, confirmOutbound, countStocktake, createStocktake, createWarehouse, fetchInboundOrderItems, fetchInboundOrders, fetchInventory, fetchInventoryLogs, fetchOutboundOrders, fetchOutboundPicklist, fetchStocktakeItems, fetchStocktakeTasks, fetchWarehouseLocations, fetchWarehouses, updateWarehouse } from '../../api/wms'
import { AmountDisplay } from '../../components/AmountDisplay'
import { PermissionButton } from '../../components/PermissionButton'
import { StatusTag } from '../../components/StatusTag'
import type {
  Bill,
  CashFlowRow,
  InboundOrder,
  InventoryItem,
  KpiMetric,
  LogisticsChannel,
  Order,
  OutboundOrder,
  PageParams,
  PageResult,
  Payable,
  ProductSku,
  ProductSpu,
  ProfitRow,
  PurchaseInquiry,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseRequisition,
  Refund,
  ReorderSuggestion,
  StocktakeItem,
  StocktakeTask,
  Supplier,
  Warehouse,
  Waybill,
} from '../../types'
import { formatAmount, maskPhone, warningText } from '../../utils/format'
import { showConfirm } from '../../utils/feedback'

export type StatusTabOption = { label: string; value: number | null }

export type CommercialPageConfig<T extends object> = {
  key: string
  title: string
  description: string
  breadcrumbs: string[]
  queryKey: string[]
  fetcher: (params: PageParams) => Promise<PageResult<T>>
  rowKey: keyof T | ((row: T) => string)
  columns: ColumnsType<T>
  statusTabs?: StatusTabOption[]
  primaryAction?: string
  onPrimaryAction?: () => void
  permission?: string
}

const purchaseTabs: StatusTabOption[] = [
  { label: '全部', value: null },
  { label: '草稿', value: 0 },
  { label: '待供应商确认', value: 1 },
  { label: '已确认', value: 2 },
  { label: '发货中', value: 3 },
  { label: '部分到货', value: 4 },
  { label: '全部到货', value: 5 },
  { label: '已对账', value: 6 },
  { label: '已结清', value: 7 },
  { label: '已取消', value: 8 },
]
const orderTabs: StatusTabOption[] = [
  { label: '全部', value: null },
  { label: '待处理', value: 0 },
  { label: '风控审核', value: 1 },
  { label: '待占库', value: 2 },
  { label: '备货中', value: 3 },
  { label: '待发货', value: 4 },
  { label: '已发货', value: 5 },
  { label: '运输中', value: 6 },
  { label: '已签收', value: 7 },
  { label: '已完成', value: 8 },
  { label: '售后中', value: 9 },
  { label: '已取消', value: 10 },
]
type FeedbackApi = {
  success: (content: string) => void
  error: (content: string) => void
  info: (content: string) => void
}

let feedbackApi: FeedbackApi = {
  success: () => undefined,
  error: () => undefined,
  info: () => undefined,
}

export function setCommercialFeedbackApi(api: FeedbackApi) {
  feedbackApi = api
}

const actions = (items: Array<{ label: string; danger?: boolean; hidden?: boolean; permission?: string; onClick: () => void }>) => {
  const visibleItems = items.filter((item) => !item.hidden)
  if (!visibleItems.length) return <Typography.Text type="secondary">-</Typography.Text>
  return (
    <Space size={2}>
      {visibleItems.map((item) => (
        <PermissionButton key={item.label} type="link" danger={item.danger} permission={item.permission} onClick={item.onClick}>
          {item.label}
        </PermissionButton>
      ))}
    </Space>
  )
}

const amount = (currency?: string) => (value: unknown) => <AmountDisplay value={Number(value || 0)} currency={currency} />
const status = (value: unknown) => <StatusTag value={String(value || '-')} />
const statusIn = (value: unknown, allowed: string[]) => allowed.includes(String(value || ''))
const refreshCurrentTable = () => window.dispatchEvent(new CustomEvent('flexchain:table-refresh'))
const showRecordDrawer = (title: string, data?: unknown, load?: () => Promise<unknown>) => {
  window.dispatchEvent(new CustomEvent('flexchain:record-drawer', { detail: { title, data, load } }))
}
const showFormDrawer = (
  title: string,
  fields: Array<{ name: string; label: string; type?: 'text' | 'number' | 'textarea' | 'select' | 'file'; required?: boolean; options?: Array<{ label: string; value: string | number }> }>,
  submit: (values: Record<string, unknown>) => Promise<unknown>,
  successText: string,
  initialValues?: Record<string, unknown>,
) => {
  window.dispatchEvent(new CustomEvent('flexchain:form-drawer', { detail: { title, fields, submit, successText, initialValues } }))
}

function confirmSupplierAudit(row: Supplier, approved: boolean) {
  showConfirm({
    title: approved ? `确认通过供应商 ${row.supplierName}？` : `确认拒绝供应商 ${row.supplierName}？`,
    content: approved ? '通过后该供应商可进入采购协作流程。' : '拒绝后供应商需要补充资料后重新提交审核。',
    okText: approved ? '通过' : '拒绝',
    cancelText: '取消',
    okButtonProps: { danger: !approved },
    onOk: async () => {
      try {
        await auditSupplier(row.id, approved, approved ? '准入资料审核通过' : '资质资料不符合准入要求，请补充后重新提交')
        feedbackApi.success(approved ? '供应商已审核通过' : '供应商已拒绝')
        refreshCurrentTable()
      } catch (error) {
        feedbackApi.error(error instanceof Error ? error.message : '供应商审核失败')
      }
    },
  })
}

function confirmSupplierSupplement(row: Supplier) {
  confirmAsyncAction(
    `要求供应商 ${row.supplierName} 补充资料？`,
    '供应商状态会退回资料补充阶段，并保留本次审核意见。',
    () => requestSupplierSupplement(row.id, '资质资料不完整，请补充证照、联系人或结算信息后重新提交'),
    '已要求供应商补充资料',
    true,
  )
}

function confirmSupplierDisable(row: Supplier) {
  confirmAsyncAction(
    `停用供应商 ${row.supplierName}？`,
    '停用后该供应商不应继续进入新的采购协作流程。',
    () => disableSupplier(row.id, '运营手动停用供应商'),
    '供应商已停用',
    true,
  )
}

function confirmSupplierEnable(row: Supplier) {
  confirmAsyncAction(
    `启用供应商 ${row.supplierName}？`,
    '启用后该供应商可重新参与采购协作流程。',
    () => enableSupplier(row.id, '运营手动启用供应商'),
    '供应商已启用',
  )
}

async function openSupplierEditForm(row: Supplier) {
  const detail = await fetchSupplierDetail(row.id)
  showFormDrawer(
    `编辑供应商 ${row.supplierName}`,
    [
      { name: 'version', label: '版本', type: 'number', required: true },
      { name: 'supplierName', label: '供应商名称', required: true },
      { name: 'contactName', label: '主联系人', required: true },
      { name: 'contactPhone', label: '手机号', required: true },
      { name: 'contactEmail', label: '邮箱', required: true },
      { name: 'province', label: '省份' },
      { name: 'city', label: '城市' },
      { name: 'address', label: '地址' },
      { name: 'website', label: '官网' },
      { name: 'currency', label: '结算币种', type: 'select', options: [{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }] },
      { name: 'leadTimeDays', label: '交货周期(天)', type: 'number' },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      updateSupplier(row.id, {
        version: Number(values.version),
        supplierName: String(values.supplierName),
        contactName: String(values.contactName),
        contactPhone: String(values.contactPhone),
        contactEmail: String(values.contactEmail),
        province: values.province ? String(values.province) : undefined,
        city: values.city ? String(values.city) : undefined,
        address: values.address ? String(values.address) : undefined,
        website: values.website ? String(values.website) : undefined,
        currency: values.currency ? String(values.currency) : undefined,
        leadTimeDays: values.leadTimeDays === undefined ? undefined : Number(values.leadTimeDays),
        remark: values.remark ? String(values.remark) : undefined,
      }),
    '供应商已更新',
    {
      version: detail.version || 0,
      supplierName: detail.supplierName,
      contactName: detail.contactName,
      contactPhone: detail.contactPhone,
      contactEmail: detail.contactEmail,
      province: detail.province,
      city: detail.city,
      currency: detail.currency,
      leadTimeDays: detail.leadTimeDays,
      remark: detail.remark,
    },
  )
}

function confirmSendPurchaseOrder(row: PurchaseOrder) {
  showConfirm({
    title: `发送采购单 ${row.orderNo}？`,
    content: '发送后供应商将进入确认或发货流程。',
    okText: '发送',
    cancelText: '取消',
    onOk: async () => {
      try {
        await urgePurchaseOrder(row.id)
        feedbackApi.success('采购单已发送供应商')
        refreshCurrentTable()
      } catch (error) {
        feedbackApi.error(error instanceof Error ? error.message : '采购单发送失败')
      }
    },
  })
}

function confirmPurchaseOrderAccepted(row: PurchaseOrder) {
  confirmAsyncAction(`确认采购单 ${row.orderNo}？`, '确认后采购单进入已确认状态，可继续标记供应商发货。', () => confirmPurchaseOrder(row.id), '采购单已确认')
}

function confirmPurchaseOrderShipping(row: PurchaseOrder) {
  confirmAsyncAction(`标记采购单 ${row.orderNo} 发货中？`, '标记后采购团队可继续跟踪到货和收货入库。', () => markPurchaseOrderShipping(row.id), '采购单已标记发货中')
}

function confirmPurchaseOrderReconcile(row: PurchaseOrder) {
  confirmAsyncAction(`确认采购单 ${row.orderNo} 已对账？`, '对账后该采购单可继续进入财务应付和结清流程。', () => reconcilePurchaseOrder(row.id), '采购单已对账')
}

function confirmPurchaseOrderCancel(row: PurchaseOrder) {
  confirmAsyncAction(`取消采购单 ${row.orderNo}？`, '取消后该采购单不会继续收货和结算，请确认供应商协作已同步。', () => cancelPurchaseOrder(row.id), '采购单已取消', true)
}

function openCreatePurchaseOrderForm() {
  showFormDrawer(
    '新建采购单',
    [
      { name: 'supplierId', label: '供应商 ID', type: 'number', required: true },
      { name: 'supplierName', label: '供应商名称', required: true },
      { name: 'warehouseId', label: '仓库 ID', type: 'number', required: true },
      { name: 'warehouseName', label: '仓库名称', required: true },
      { name: 'currency', label: '币种', type: 'select', options: [{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }] },
      { name: 'exchangeRate', label: '汇率', type: 'number' },
      { name: 'paymentType', label: '付款方式', type: 'select', options: [{ label: '账期', value: 1 }, { label: '预付', value: 2 }, { label: '到付', value: 3 }] },
      { name: 'paymentDays', label: '账期天数', type: 'number' },
      { name: 'orderDate', label: '下单日期' },
      { name: 'expectedDate', label: '预计到货日期' },
      { name: 'contractNo', label: '合同号' },
      { name: 'invoiceNo', label: '发票号' },
      { name: 'skuId', label: 'SKU ID', type: 'number', required: true },
      { name: 'skuCode', label: 'SKU 编码', required: true },
      { name: 'skuName', label: 'SKU 名称', required: true },
      { name: 'spec', label: '规格' },
      { name: 'unit', label: '单位' },
      { name: 'quantity', label: '采购数量', type: 'number', required: true },
      { name: 'unitPrice', label: '采购单价', type: 'number', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) => {
      const quantity = Number(values.quantity)
      const unitPrice = Number(values.unitPrice)
      return createPurchaseOrder({
        supplierId: Number(values.supplierId),
        supplierName: String(values.supplierName),
        warehouseId: Number(values.warehouseId),
        warehouseName: String(values.warehouseName),
        totalAmount: quantity * unitPrice,
        currency: values.currency ? String(values.currency) : 'CNY',
        exchangeRate: values.exchangeRate === undefined ? 1 : Number(values.exchangeRate),
        paymentType: values.paymentType === undefined ? undefined : Number(values.paymentType),
        paymentDays: values.paymentDays === undefined ? undefined : Number(values.paymentDays),
        orderDate: values.orderDate ? String(values.orderDate) : undefined,
        expectedDate: values.expectedDate ? String(values.expectedDate) : undefined,
        contractNo: values.contractNo ? String(values.contractNo) : undefined,
        invoiceNo: values.invoiceNo ? String(values.invoiceNo) : undefined,
        remark: values.remark ? String(values.remark) : undefined,
        items: [
          {
            skuId: Number(values.skuId),
            skuCode: String(values.skuCode),
            skuName: String(values.skuName),
            spec: values.spec ? String(values.spec) : undefined,
            unit: values.unit ? String(values.unit) : undefined,
            quantity,
            unitPrice,
            refPrice: unitPrice,
            expectDate: values.expectedDate ? String(values.expectedDate) : undefined,
            remark: values.remark ? String(values.remark) : undefined,
          },
        ],
      })
    },
    '采购单已创建',
    { currency: 'CNY', exchangeRate: 1, paymentType: 1, paymentDays: 30, unit: '件' },
  )
}

function openRequisitionToOrderForm(row: PurchaseRequisition) {
  showFormDrawer(
    `采购申请 ${row.reqNo} 转采购单`,
    [
      { name: 'supplierId', label: '供应商 ID', type: 'number', required: true },
      { name: 'supplierName', label: '供应商名称', required: true },
      { name: 'warehouseId', label: '仓库 ID', type: 'number', required: true },
      { name: 'warehouseName', label: '仓库名称', required: true },
      { name: 'currency', label: '币种', type: 'select', options: [{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }] },
      { name: 'exchangeRate', label: '汇率', type: 'number' },
      { name: 'paymentType', label: '付款方式', type: 'select', options: [{ label: '账期', value: 1 }, { label: '预付', value: 2 }, { label: '到付', value: 3 }] },
      { name: 'paymentDays', label: '账期天数', type: 'number' },
      { name: 'orderDate', label: '下单日期' },
      { name: 'expectedDate', label: '预计到货日期' },
      { name: 'skuId', label: 'SKU ID', type: 'number', required: true },
      { name: 'skuCode', label: 'SKU 编码', required: true },
      { name: 'skuName', label: 'SKU 名称', required: true },
      { name: 'spec', label: '规格' },
      { name: 'unit', label: '单位' },
      { name: 'quantity', label: '采购数量', type: 'number', required: true },
      { name: 'unitPrice', label: '采购单价', type: 'number', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) => {
      const quantity = Number(values.quantity)
      const unitPrice = Number(values.unitPrice)
      return createPurchaseOrder({
        reqId: Number(row.id),
        supplierId: Number(values.supplierId),
        supplierName: String(values.supplierName),
        warehouseId: Number(values.warehouseId),
        warehouseName: String(values.warehouseName),
        totalAmount: quantity * unitPrice,
        currency: values.currency ? String(values.currency) : 'CNY',
        exchangeRate: values.exchangeRate === undefined ? 1 : Number(values.exchangeRate),
        paymentType: values.paymentType === undefined ? undefined : Number(values.paymentType),
        paymentDays: values.paymentDays === undefined ? undefined : Number(values.paymentDays),
        orderDate: values.orderDate ? String(values.orderDate) : undefined,
        expectedDate: values.expectedDate ? String(values.expectedDate) : undefined,
        remark: values.remark ? String(values.remark) : `由采购申请 ${row.reqNo} 转单`,
        items: [
          {
            skuId: Number(values.skuId),
            skuCode: String(values.skuCode),
            skuName: String(values.skuName),
            spec: values.spec ? String(values.spec) : undefined,
            unit: values.unit ? String(values.unit) : undefined,
            quantity,
            unitPrice,
            refPrice: unitPrice,
            expectDate: values.expectedDate ? String(values.expectedDate) : undefined,
            remark: values.remark ? String(values.remark) : undefined,
          },
        ],
      })
    },
    '采购申请已转为采购单',
    {
      currency: 'CNY',
      exchangeRate: 1,
      paymentType: 1,
      paymentDays: 30,
      orderDate: new Date().toISOString().slice(0, 10),
      unit: '件',
      remark: `由采购申请 ${row.reqNo} 转单`,
    },
  )
}

function confirmPurchaseRequisitionAudit(row: PurchaseRequisition, approved: boolean) {
  confirmAsyncAction(
    approved ? `审批通过采购申请 ${row.reqNo}？` : `拒绝采购申请 ${row.reqNo}？`,
    approved ? '通过后该采购申请可继续转询价或采购订单。' : '拒绝后申请人需要调整需求后重新提交。',
    () => auditPurchaseRequisition(row.id, approved, approved ? '采购需求审核通过' : '采购需求信息不完整，请补充后重新提交'),
    approved ? '采购申请已通过' : '采购申请已拒绝',
    !approved,
  )
}

function confirmPurchaseRequisitionSubmit(row: PurchaseRequisition) {
  confirmAsyncAction(`提交采购申请 ${row.reqNo}？`, '提交后系统将根据金额进入自动通过或待审批流程。', () => submitPurchaseRequisition(row.id), '采购申请已提交')
}

function openCreateRequisitionForm() {
  showFormDrawer(
    '新建采购申请',
    [
      { name: 'title', label: '申请标题', required: true },
      { name: 'warehouseId', label: '仓库 ID', type: 'number', required: true },
      { name: 'expectDate', label: '期望到货日期' },
      { name: 'priority', label: '优先级', type: 'select', options: [{ label: '普通', value: 2 }, { label: '紧急', value: 1 }, { label: '低', value: 3 }] },
      { name: 'applyUserId', label: '申请人 ID', type: 'number', required: true },
      { name: 'applyUserName', label: '申请人姓名', required: true },
      { name: 'skuId', label: 'SKU ID', type: 'number', required: true },
      { name: 'skuCode', label: 'SKU 编码', required: true },
      { name: 'skuName', label: 'SKU 名称', required: true },
      { name: 'spec', label: '规格' },
      { name: 'unit', label: '单位' },
      { name: 'quantity', label: '采购数量', type: 'number', required: true },
      { name: 'currentStock', label: '当前库存', type: 'number' },
      { name: 'safetyStock', label: '安全库存', type: 'number' },
      { name: 'inTransitQty', label: '在途数量', type: 'number' },
      { name: 'refPrice', label: '参考单价', type: 'number' },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) => {
      const quantity = Number(values.quantity)
      const refPrice = values.refPrice === undefined ? undefined : Number(values.refPrice)
      return createPurchaseRequisition({
        reqSource: 3,
        title: String(values.title),
        warehouseId: Number(values.warehouseId),
        expectDate: values.expectDate ? String(values.expectDate) : undefined,
        totalAmount: refPrice === undefined ? undefined : quantity * refPrice,
        priority: values.priority === undefined ? 2 : Number(values.priority),
        applyUserId: Number(values.applyUserId),
        applyUserName: String(values.applyUserName),
        remark: values.remark ? String(values.remark) : undefined,
        items: [
          {
            skuId: Number(values.skuId),
            skuCode: String(values.skuCode),
            skuName: String(values.skuName),
            spec: values.spec ? String(values.spec) : undefined,
            unit: values.unit ? String(values.unit) : undefined,
            quantity,
            currentStock: values.currentStock === undefined ? undefined : Number(values.currentStock),
            safetyStock: values.safetyStock === undefined ? undefined : Number(values.safetyStock),
            inTransitQty: values.inTransitQty === undefined ? undefined : Number(values.inTransitQty),
            refPrice,
            unitPrice: refPrice,
            expectDate: values.expectDate ? String(values.expectDate) : undefined,
            remark: values.remark ? String(values.remark) : undefined,
          },
        ],
      })
    },
    '采购申请已创建',
    { priority: 2, applyUserId: 1, applyUserName: '当前用户', unit: '件' },
  )
}

function confirmSelectInquiry(row: PurchaseInquiry) {
  confirmAsyncAction(`选定询价单 ${row.inquiryNo} 的报价？`, '选定后该询价单将进入后续采购订单生成流程。', () => selectPurchaseInquiry(row.id), '报价已选定')
}

function confirmPurchaseReceiptInbound(row: PurchaseReceipt) {
  confirmAsyncAction(`确认收货单 ${row.receiptNo} 入库？`, '确认后会联动 WMS 增加入库库存，并生成或更新财务应付。', () => confirmPurchaseReceipt(row.id), '收货单已确认入库')
}

function openPurchaseOrderReceiptForm(row: PurchaseOrder) {
  showFormDrawer(
    `采购单 ${row.orderNo} 创建收货单`,
    [
      { name: 'receiveDate', label: '收货日期', required: true },
      { name: 'receiverId', label: '收货人 ID', type: 'number', required: true },
      { name: 'receiverName', label: '收货人姓名', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    async (values) => {
      const detail = await fetchPurchaseOrderDetail(row.id)
      const items = detail.items.map((item, index) => ({
        poItemId: (item.id ? Number(item.id) : index + 1),
        expectedQty: item.quantity,
        actualQty: item.quantity,
        passQty: item.quantity,
        rejectQty: 0,
        rejectReason: '',
      }))
      return createPurchaseReceipt({
        poId: Number(row.id),
        receiveDate: String(values.receiveDate),
        receiverId: Number(values.receiverId),
        receiverName: String(values.receiverName),
        remark: values.remark ? String(values.remark) : `由采购单 ${row.orderNo} 创建收货单`,
        items,
      })
    },
    '收货单已创建',
    { receiveDate: new Date().toISOString().slice(0, 10), receiverId: 1, receiverName: '当前用户', remark: `由采购单 ${row.orderNo} 创建收货单` },
  )
}

function confirmAsyncAction(title: string, content: string, action: () => Promise<unknown>, successText: string, danger = false) {
  showConfirm({
    title,
    content,
    okText: danger ? '确认执行' : '确认',
    cancelText: '取消',
    okButtonProps: { danger },
    onOk: async () => {
      try {
        await action()
        feedbackApi.success(successText)
        refreshCurrentTable()
      } catch (error) {
        feedbackApi.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
      }
    },
  })
}

function confirmOrderApprove(row: Order) {
  confirmAsyncAction(`审核通过订单 ${row.orderNo}？`, '通过后订单将继续进入占库、出库和物流履约流程。', () => approveOrder(row.id), '订单审核已通过')
}

function confirmOrderCancel(row: Order) {
  confirmAsyncAction(`取消订单 ${row.orderNo}？`, '取消后该订单不会继续履约，请确认已与客户或平台流程同步。', () => cancelOrder(row.id, '运营手动取消订单'), '订单已取消', true)
}

function confirmOrderFlag(row: Order) {
  confirmAsyncAction(`标记订单 ${row.orderNo} 为异常？`, '异常订单会进入人工处理队列，方便运营团队持续跟进。', () => flagOrder(row.id, '运营标记异常，需人工复核履约风险'), '订单已标记异常', true)
}

function confirmOrderSync(row: Order) {
  confirmAsyncAction(`同步订单 ${row.orderNo}？`, '将尝试刷新该订单的平台状态和最新履约信息。', () => syncOrder(row.id), '订单同步已触发')
}

function confirmRefundAudit(row: Refund, approved: boolean) {
  confirmAsyncAction(
    approved ? `通过退款 ${row.refundNo}？` : `拒绝退款 ${row.refundNo}？`,
    approved ? '通过后退款单将进入收货或退款完成流程。' : '拒绝后需要保留明确原因供客服和财务追踪。',
    () => auditRefund(row.id, approved, approved ? row.amount : undefined, approved ? undefined : '退款申请不符合审核条件'),
    approved ? '退款审核已通过' : '退款已拒绝',
    !approved,
  )
}

function confirmRefundReceived(row: Refund) {
  confirmAsyncAction(`确认收到退货 ${row.refundNo}？`, '确认收货后可继续执行退款完成动作。', () => markRefundReceived(row.id), '退货收货已确认')
}

function confirmRefundComplete(row: Refund) {
  confirmAsyncAction(`完成退款 ${row.refundNo}？`, '完成后财务和售后状态会同步更新。', () => completeRefund(row.id), '退款已完成')
}

function confirmOutboundShip(row: OutboundOrder) {
  confirmAsyncAction(`确认出库 ${row.outboundNo}？`, '确认后库存会扣减，并进入物流履约后续流程。', () => confirmOutbound(row.id), '出库已确认')
}

function warehouseIdOf(row: InboundOrder) {
  if (row.warehouseId) return row.warehouseId
  const known: Record<string, string> = {
    宁波国内仓: '910000000000000502',
    洛杉矶海外仓: '910000000000000501',
    汉堡欧洲仓: '910000000000000503',
  }
  return known[row.warehouse] || ''
}

function confirmInboundReceive(row: InboundOrder) {
  showConfirm({
    title: `确认入库 ${row.inboundNo}？`,
    content: '系统将按入库明细的计划数量确认收货，并自动选择当前仓库的可用库位。后续可在库存流水中追踪变动。',
    okText: '确认入库',
    cancelText: '取消',
    onOk: async () => {
      try {
        const warehouseId = warehouseIdOf(row)
        if (!warehouseId) throw new Error('当前入库单缺少仓库 ID，无法确认入库')
        const [items, locations] = await Promise.all([fetchInboundOrderItems(row.id), fetchWarehouseLocations(warehouseId, true)])
        const location = locations[0]
        if (!items.length) throw new Error('当前入库单缺少明细，无法确认入库')
        if (!location) throw new Error('当前仓库没有可用库位，请先维护库位')

        await confirmInbound(row.id, {
          actualDate: new Date().toISOString().slice(0, 10),
          operatorName: '仓储人员',
          items: items.map((item) => ({
            itemId: item.id,
            skuId: item.skuId,
            skuCode: item.skuCode,
            skuName: item.skuName,
            quantity: item.expectedQty,
            actualQty: item.expectedQty,
            defectiveQty: 0,
            locationId: location.id,
            locationCode: location.locationCode,
            unitCost: item.unitCost || 0,
            remark: '前端工作台确认入库',
          })),
        })
        feedbackApi.success('入库已确认，库存将同步更新')
        refreshCurrentTable()
      } catch (error) {
        feedbackApi.error(error instanceof Error ? error.message : '确认入库失败')
      }
    },
  })
}

function confirmPayableApply(row: Payable) {
  confirmAsyncAction(`发起付款申请 ${row.payableNo}？`, '发起后该应付单将进入付款审批流程。', () => applyPayable(row.id), '付款申请已发起')
}

function confirmPayableApprove(row: Payable) {
  confirmAsyncAction(`审批付款 ${row.payableNo}？`, '审批通过后财务可登记付款或标记已付款。', () => approvePayable(row.id), '付款申请已审批')
}

function confirmPayablePaid(row: Payable) {
  confirmAsyncAction(
    `确认已付款 ${row.payableNo}？`,
    '确认后系统会按剩余应付金额登记付款记录，并更新应付状态。',
    () => markPayablePaid(row.id),
    '付款已登记',
  )
}

function confirmBillParse(row: Bill) {
  confirmAsyncAction(`解析账单 ${row.billNo}？`, '系统将重新触发平台账单解析，并在完成后更新账单状态和明细。', () => parseBill(row.id), '账单解析已触发')
}

function confirmBillReconcile(row: Bill) {
  confirmAsyncAction(`确认账单 ${row.billNo} 对账完成？`, '确认后系统会生成对应结算现金流，并锁定当前对账结果。', () => confirmBill(row.id), '账单对账已确认')
}

function openUploadBillForm() {
  showFormDrawer(
    '上传平台账单',
    [
      { name: 'file', label: '账单文件', type: 'file', required: true },
      { name: 'platform', label: '平台', type: 'select', required: true, options: [{ label: 'Amazon', value: 'Amazon' }, { label: 'TikTok', value: 'TikTok' }, { label: 'Shopee', value: 'Shopee' }, { label: 'Shopify', value: 'Shopify' }] },
      { name: 'storeId', label: '店铺 ID' },
      { name: 'currency', label: '币种', type: 'select', options: [{ label: 'USD', value: 'USD' }, { label: 'CNY', value: 'CNY' }, { label: 'EUR', value: 'EUR' }] },
    ],
    (values) => {
      const files = values.file as Array<{ originFileObj?: File }>
      const file = files?.[0]?.originFileObj
      if (!file) throw new Error('请先选择账单文件')
      return uploadBill(file, {
        platform: values.platform ? String(values.platform) : undefined,
        storeId: values.storeId ? String(values.storeId) : undefined,
        currency: values.currency ? String(values.currency) : undefined,
      })
    },
    '账单已上传',
    { platform: 'Amazon', currency: 'USD' },
  )
}

function confirmReorderToPurchase(row: ReorderSuggestion) {
  confirmAsyncAction(
    `将 ${row.skuCode} 的补货建议转采购申请？`,
    '系统会按当前 BI 补货建议生成采购申请，采购团队可在采购申请页继续审核和下单。',
    () => convertReorderToPurchase(row),
    '补货建议已转采购申请',
  )
}

function confirmChannelDisable(row: LogisticsChannel) {
  confirmAsyncAction(
    `禁用物流渠道 ${row.channelName}？`,
    '禁用后该渠道不会继续参与物流推荐和新运单履约，请确认已有替代渠道。',
    () => disableLogisticsChannel(row.id),
    '物流渠道已禁用',
    true,
  )
}

function confirmSpuPublish(row: ProductSpu, onSale = true) {
  confirmAsyncAction(
    `${onSale ? '上架' : '下架'}商品 ${row.spuName}？`,
    onSale ? '上架后商品可进入销售、补货和订单履约链路。' : '下架后商品不应继续承接新销售订单。',
    () => publishSpu(row.id, onSale),
    onSale ? '商品已上架' : '商品已下架',
    !onSale,
  )
}

function openSpuEditForm(row: ProductSpu) {
  showFormDrawer(
    `编辑商品 ${row.spuName}`,
    [
      { name: 'spuName', label: '商品名称', required: true },
      { name: 'categoryId', label: '分类 ID', type: 'number', required: true },
      { name: 'categoryPath', label: '分类路径' },
      { name: 'brand', label: '品牌' },
      { name: 'originCountry', label: '原产国' },
      { name: 'material', label: '材质' },
      { name: 'spuDesc', label: '商品描述', type: 'textarea' },
      { name: 'packageDesc', label: '包装描述', type: 'textarea' },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      updateSpu(row.id, {
        spuName: String(values.spuName),
        categoryId: Number(values.categoryId),
        categoryPath: values.categoryPath ? String(values.categoryPath) : undefined,
        brand: values.brand ? String(values.brand) : undefined,
        originCountry: values.originCountry ? String(values.originCountry) : undefined,
        material: values.material ? String(values.material) : undefined,
        spuDesc: values.spuDesc ? String(values.spuDesc) : undefined,
        packageDesc: values.packageDesc ? String(values.packageDesc) : undefined,
        remark: values.remark ? String(values.remark) : undefined,
      }),
    '商品已更新',
    {
      spuName: row.spuName,
      categoryId: row.categoryId ? Number(row.categoryId) : undefined,
      categoryPath: row.categoryPath,
      brand: row.brand,
      originCountry: row.originCountry,
      material: row.material,
      spuDesc: row.spuDesc,
      packageDesc: row.packageDesc,
    },
  )
}

function openSkuPriceForm(row: ProductSku) {
  showFormDrawer(
    `维护 SKU ${row.skuCode} 价格`,
    [
      { name: 'price', label: '销售价格', type: 'number', required: true },
      { name: 'currency', label: '币种', type: 'select', required: true, options: [{ label: 'USD', value: 'USD' }, { label: 'CNY', value: 'CNY' }, { label: 'EUR', value: 'EUR' }] },
    ],
    (values) => updateSkuPrice(row.id, Number(values.price), String(values.currency || 'USD')),
    'SKU 价格已保存',
    { price: row.salePrice || 0, currency: row.currency || 'USD' },
  )
}

function openBatchSkuForm() {
  showFormDrawer(
    '批量生成 SKU',
    [
      { name: 'spuId', label: 'SPU ID', type: 'number', required: true },
      { name: 'skuCode', label: 'SKU 编码' },
      { name: 'skuName', label: 'SKU 名称', required: true },
      { name: 'barcode', label: '条码' },
      { name: 'fnsku', label: 'FNSKU' },
      { name: 'specValues', label: '规格 JSON', type: 'textarea' },
      { name: 'netWeightG', label: '净重(g)', type: 'number' },
      { name: 'grossWeightG', label: '毛重(g)', type: 'number' },
      { name: 'lengthMm', label: '长(mm)', type: 'number' },
      { name: 'widthMm', label: '宽(mm)', type: 'number' },
      { name: 'heightMm', label: '高(mm)', type: 'number' },
      { name: 'isBattery', label: '含电池', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'isLiquid', label: '含液体', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'isPowder', label: '含粉末', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'costPrice', label: '成本价', type: 'number' },
      { name: 'costCurrency', label: '成本币种', type: 'select', options: [{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }] },
      { name: 'abcClass', label: 'ABC 分类', type: 'select', options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }] },
      { name: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 0 }, { label: '正常', value: 1 }] },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      batchCreateSkus(Number(values.spuId), [
        {
          skuCode: values.skuCode ? String(values.skuCode) : undefined,
          skuName: String(values.skuName),
          barcode: values.barcode ? String(values.barcode) : undefined,
          fnsku: values.fnsku ? String(values.fnsku) : undefined,
          specValues: values.specValues ? String(values.specValues) : undefined,
          netWeightG: values.netWeightG === undefined ? undefined : Number(values.netWeightG),
          grossWeightG: values.grossWeightG === undefined ? undefined : Number(values.grossWeightG),
          lengthMm: values.lengthMm === undefined ? undefined : Number(values.lengthMm),
          widthMm: values.widthMm === undefined ? undefined : Number(values.widthMm),
          heightMm: values.heightMm === undefined ? undefined : Number(values.heightMm),
          isBattery: values.isBattery === undefined ? 0 : Number(values.isBattery),
          isLiquid: values.isLiquid === undefined ? 0 : Number(values.isLiquid),
          isPowder: values.isPowder === undefined ? 0 : Number(values.isPowder),
          costPrice: values.costPrice === undefined ? undefined : Number(values.costPrice),
          costCurrency: values.costCurrency ? String(values.costCurrency) : 'CNY',
          abcClass: values.abcClass ? String(values.abcClass) : 'C',
          status: values.status === undefined ? 0 : Number(values.status),
          remark: values.remark ? String(values.remark) : undefined,
        },
      ]),
    'SKU 已生成',
    { isBattery: 0, isLiquid: 0, isPowder: 0, costCurrency: 'CNY', abcClass: 'C', status: 0, specValues: '{}' },
  )
}

function openCreateStocktakeForm() {
  showFormDrawer(
    '新建盘点',
    [
      { name: 'taskType', label: '盘点类型', type: 'select', required: true, options: [{ label: '全盘', value: 1 }, { label: '抽盘', value: 2 }, { label: '循环盘点', value: 3 }] },
      { name: 'warehouseId', label: '仓库 ID', type: 'number', required: true },
      { name: 'taskName', label: '任务名称', required: true },
      { name: 'planDate', label: '计划盘点日期', required: true },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      createStocktake({
        taskType: Number(values.taskType),
        warehouseId: Number(values.warehouseId),
        taskName: String(values.taskName),
        planDate: String(values.planDate),
        remark: values.remark ? String(values.remark) : undefined,
      }),
    '盘点任务已创建',
  )
}

async function openStocktakeCountForm(row: StocktakeTask) {
  try {
    const items = await fetchStocktakeItems(row.id)
    if (!items.length) {
      feedbackApi.info('当前盘点任务没有可录入的明细，请确认仓库库存和库位数据。')
      return
    }
    const countItems = items.map((item) => ({
      itemId: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      quantity: item.bookQty,
      actualQty: item.actualQty ?? item.bookQty,
      locationId: item.locationId ? Number(item.locationId) : undefined,
      locationCode: item.locationCode,
      remark: item.diffReason,
    }))
    showFormDrawer(
      `录入盘点 ${row.taskNo} 实盘`,
      [
        { name: 'pickerId', label: '盘点人 ID', type: 'number', required: true },
        { name: 'itemsJson', label: '实盘明细 JSON', type: 'textarea', required: true },
      ],
      (values) => {
        const parsedItems = JSON.parse(String(values.itemsJson)) as Array<Record<string, unknown>>
        return countStocktake(row.id, {
          pickerId: Number(values.pickerId),
          items: parsedItems.map((item) => ({
            ...item,
            itemId: Number(item.itemId),
            skuId: Number(item.skuId),
            quantity: Number(item.quantity),
            actualQty: Number(item.actualQty),
            locationId: item.locationId === undefined || item.locationId === null || item.locationId === '' ? undefined : Number(item.locationId),
          })),
        })
      },
      '实盘数据已提交',
      { pickerId: 1, itemsJson: JSON.stringify(countItems, null, 2) },
    )
  } catch (error) {
    feedbackApi.error(error instanceof Error ? error.message : '盘点明细加载失败')
  }
}

function confirmStocktakeAudit(row: StocktakeTask) {
  showFormDrawer(
    `审核盘点 ${row.taskNo} 差异`,
    [
      { name: 'auditorId', label: '审核人 ID', type: 'number', required: true },
      { name: 'auditRemark', label: '审核备注', type: 'textarea' },
    ],
    (values) =>
      auditStocktake(row.id, {
        auditorId: Number(values.auditorId),
        auditRemark: values.auditRemark ? String(values.auditRemark) : undefined,
      }),
    '盘点差异已审核并完成库存调整',
    { auditorId: 1, auditRemark: '盘点差异复核通过，按实盘结果调整库存。' },
  )
}

async function loadStocktakeDiffItems(id: string | number): Promise<StocktakeItem[]> {
  const items = await fetchStocktakeItems(id)
  return items.filter((item) => Number(item.diffQty || 0) !== 0)
}

function openCreateChannelForm() {
  showFormDrawer(
    '新增物流渠道',
    [
      { name: 'carrierId', label: '物流商 ID', type: 'number', required: true },
      { name: 'channelCode', label: '渠道编码', required: true },
      { name: 'channelName', label: '渠道名称', required: true },
      { name: 'channelType', label: '渠道类型', type: 'select', required: true, options: [{ label: '标准', value: 1 }, { label: '加急', value: 2 }, { label: '经济', value: 3 }] },
      { name: 'countryCodes', label: '适用国家', required: true },
      { name: 'minWeightG', label: '最小重量(g)', type: 'number' },
      { name: 'maxWeightG', label: '最大重量(g)', type: 'number', required: true },
      { name: 'maxLengthMm', label: '最大长度(mm)', type: 'number' },
      { name: 'maxGirthMm', label: '最大围长(mm)', type: 'number' },
      { name: 'allowBattery', label: '是否允许电池', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'allowLiquid', label: '是否允许液体', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'allowPowder', label: '是否允许粉末', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'allowFood', label: '是否允许食品', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'minDays', label: '最短时效', type: 'number', required: true },
      { name: 'maxDays', label: '最长时效', type: 'number', required: true },
      { name: 'volumeFactor', label: '体积系数', type: 'number' },
      { name: 'declaredValueLimit', label: '申报价值上限', type: 'number' },
      { name: 'sortOrder', label: '排序', type: 'number' },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      createLogisticsChannel({
        carrierId: Number(values.carrierId),
        channelCode: String(values.channelCode),
        channelName: String(values.channelName),
        channelType: Number(values.channelType),
        countryCodes: String(values.countryCodes),
        minWeightG: values.minWeightG === undefined ? 0 : Number(values.minWeightG),
        maxWeightG: Number(values.maxWeightG),
        maxLengthMm: values.maxLengthMm === undefined ? undefined : Number(values.maxLengthMm),
        maxGirthMm: values.maxGirthMm === undefined ? undefined : Number(values.maxGirthMm),
        allowBattery: values.allowBattery === undefined ? 0 : Number(values.allowBattery),
        allowLiquid: values.allowLiquid === undefined ? 0 : Number(values.allowLiquid),
        allowPowder: values.allowPowder === undefined ? 0 : Number(values.allowPowder),
        allowFood: values.allowFood === undefined ? 1 : Number(values.allowFood),
        minDays: Number(values.minDays),
        maxDays: Number(values.maxDays),
        volumeFactor: values.volumeFactor === undefined ? 5000 : Number(values.volumeFactor),
        declaredValueLimit: values.declaredValueLimit === undefined ? undefined : Number(values.declaredValueLimit),
        sortOrder: values.sortOrder === undefined ? 0 : Number(values.sortOrder),
        remark: values.remark ? String(values.remark) : undefined,
      }),
    '物流渠道已创建',
    { minWeightG: 0, allowBattery: 0, allowLiquid: 0, allowPowder: 0, allowFood: 1, volumeFactor: 5000, sortOrder: 0 },
  )
}

function openInventoryAdjustForm(row: InventoryItem) {
  showFormDrawer(
    `${row.skuCode} 库存调整`,
    [
      { name: 'changeQty', label: '调整数量', type: 'number', required: true },
      { name: 'reason', label: '调整原因', type: 'textarea', required: true },
    ],
    (values) =>
      adjustInventory(row.id, {
        warehouseId: row.warehouseId,
        skuId: row.skuId,
        skuCode: row.skuCode,
        changeQty: values.changeQty,
        adjustType: 0,
        reason: values.reason,
        operatorName: '当前用户',
      }),
    '库存调整已提交',
  )
}

function openWarehouseEditForm(row: Warehouse) {
  showFormDrawer(
    `编辑仓库 ${row.warehouseName}`,
    [
      { name: 'warehouseCode', label: '仓库编码', required: true },
      { name: 'warehouseName', label: '仓库名称', required: true },
      { name: 'warehouseType', label: '仓库类型', type: 'select', required: true, options: [{ label: '国内仓', value: 1 }, { label: '海外仓', value: 2 }, { label: '虚拟仓', value: 3 }] },
      { name: 'countryCode', label: '国家代码' },
      { name: 'countryName', label: '国家名称' },
      { name: 'province', label: '省份' },
      { name: 'city', label: '城市' },
      { name: 'address', label: '详细地址' },
      { name: 'zipCode', label: '邮编' },
      { name: 'contactName', label: '联系人' },
      { name: 'contactPhone', label: '联系电话' },
      { name: 'contactEmail', label: '联系邮箱' },
      { name: 'areaSqm', label: '面积(㎡)', type: 'number' },
      { name: 'isDefault', label: '默认仓', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'status', label: '状态', type: 'select', options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
      { name: 'remark', label: '备注', type: 'textarea' },
    ],
    (values) =>
      updateWarehouse(row.id, {
        warehouseCode: String(values.warehouseCode),
        warehouseName: String(values.warehouseName),
        warehouseType: Number(values.warehouseType),
        countryCode: values.countryCode ? String(values.countryCode) : undefined,
        countryName: values.countryName ? String(values.countryName) : undefined,
        province: values.province ? String(values.province) : undefined,
        city: values.city ? String(values.city) : undefined,
        address: values.address ? String(values.address) : undefined,
        zipCode: values.zipCode ? String(values.zipCode) : undefined,
        contactName: values.contactName ? String(values.contactName) : undefined,
        contactPhone: values.contactPhone ? String(values.contactPhone) : undefined,
        contactEmail: values.contactEmail ? String(values.contactEmail) : undefined,
        areaSqm: values.areaSqm === undefined ? undefined : Number(values.areaSqm),
        isDefault: values.isDefault === undefined ? 0 : Number(values.isDefault),
        status: values.status === undefined ? 1 : Number(values.status),
        remark: values.remark ? String(values.remark) : undefined,
      }),
    '仓库已更新',
    {
      warehouseCode: row.warehouseCode,
      warehouseName: row.warehouseName,
      warehouseType: row.warehouseType || 1,
      countryCode: row.countryCode,
      countryName: row.countryName,
      province: row.province,
      city: row.city,
      address: row.address,
      zipCode: row.zipCode,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      areaSqm: row.areaSqm,
      isDefault: row.isDefault || 0,
      status: row.status === '已停用' ? 0 : 1,
      remark: row.remark,
    },
  )
}

function confirmWaybillRefresh(row: Waybill) {
  confirmAsyncAction(`刷新运单 ${row.waybillNo} 轨迹？`, '系统将向物流服务拉取最新轨迹并回写当前运单。', () => refreshWaybillTracks(row.id), '轨迹刷新已触发')
}

function openCreateWaybillForm() {
  showFormDrawer(
    '创建运单',
    [
      { name: 'orderId', label: '订单 ID', type: 'number', required: true },
      { name: 'orderNo', label: '订单号', required: true },
      { name: 'warehouseId', label: '仓库 ID', type: 'number', required: true },
      { name: 'channelId', label: '物流渠道 ID', type: 'number' },
      { name: 'receiverName', label: '收件人', required: true },
      { name: 'receiverPhone', label: '收件电话' },
      { name: 'countryCode', label: '目的国代码', required: true },
      { name: 'state', label: '州/省' },
      { name: 'city', label: '城市' },
      { name: 'addressLine1', label: '地址 1', required: true },
      { name: 'addressLine2', label: '地址 2' },
      { name: 'zipCode', label: '邮编', required: true },
      { name: 'actualWeightG', label: '实际重量(g)', type: 'number', required: true },
      { name: 'lengthMm', label: '长(mm)', type: 'number' },
      { name: 'widthMm', label: '宽(mm)', type: 'number' },
      { name: 'heightMm', label: '高(mm)', type: 'number' },
      { name: 'declaredValue', label: '申报价值', type: 'number', required: true },
      { name: 'declaredCurrency', label: '申报币种', type: 'select', options: [{ label: 'USD', value: 'USD' }, { label: 'CNY', value: 'CNY' }, { label: 'EUR', value: 'EUR' }] },
      { name: 'declaredNameEn', label: '英文申报名', required: true },
      { name: 'hsCode', label: 'HS Code' },
      { name: 'isGift', label: '是否礼品', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'hasBattery', label: '含电池', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'hasLiquid', label: '含液体', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
      { name: 'hasPowder', label: '含粉末', type: 'select', options: [{ label: '否', value: 0 }, { label: '是', value: 1 }] },
    ],
    (values) =>
      createWaybill({
        channelId: values.channelId === undefined ? undefined : Number(values.channelId),
        orderId: Number(values.orderId),
        orderNo: String(values.orderNo),
        warehouseId: Number(values.warehouseId),
        receiverName: String(values.receiverName),
        receiverPhone: values.receiverPhone ? String(values.receiverPhone) : undefined,
        countryCode: String(values.countryCode).toUpperCase(),
        state: values.state ? String(values.state) : undefined,
        city: values.city ? String(values.city) : undefined,
        addressLine1: String(values.addressLine1),
        addressLine2: values.addressLine2 ? String(values.addressLine2) : undefined,
        zipCode: String(values.zipCode),
        actualWeightG: Number(values.actualWeightG),
        lengthMm: values.lengthMm === undefined ? undefined : Number(values.lengthMm),
        widthMm: values.widthMm === undefined ? undefined : Number(values.widthMm),
        heightMm: values.heightMm === undefined ? undefined : Number(values.heightMm),
        declaredValue: Number(values.declaredValue),
        declaredCurrency: values.declaredCurrency ? String(values.declaredCurrency) : 'USD',
        declaredNameEn: String(values.declaredNameEn),
        hsCode: values.hsCode ? String(values.hsCode) : undefined,
        isGift: values.isGift === undefined ? 0 : Number(values.isGift),
        hasBattery: Number(values.hasBattery || 0) === 1,
        hasLiquid: Number(values.hasLiquid || 0) === 1,
        hasPowder: Number(values.hasPowder || 0) === 1,
      }),
    '运单已创建',
    { declaredCurrency: 'USD', isGift: 0, hasBattery: 0, hasLiquid: 0, hasPowder: 0 },
  )
}

function openWaybillExceptionForm(row: Waybill) {
  showFormDrawer(
    `上报运单 ${row.waybillNo} 异常`,
    [{ name: 'remark', label: '异常说明', type: 'textarea', required: true }],
    (values) => updateWaybillStatus(row.id, { status: 8, remark: String(values.remark) }),
    '运单异常已上报',
    { remark: row.currentTrack && row.currentTrack !== '-' ? row.currentTrack : undefined },
  )
}

function confirmWaybillCancel(row: Waybill) {
  confirmAsyncAction(`取消运单 ${row.waybillNo}？`, '取消后该运单不会继续揽收履约，已揽收运单将由后端拒绝取消。', () => cancelWaybill(row.id), '运单已取消', true)
}

export const pageConfigs = {
  suppliers: {
    key: 'suppliers',
    title: '供应商列表',
    description: '管理供应商准入、资质、联系人、评级与审核流程。',
    breadcrumbs: ['卖家工作台', '供应商管理', '供应商列表'],
    queryKey: ['srm', 'suppliers'],
    fetcher: fetchSuppliers,
    rowKey: 'id',
    primaryAction: '新增供应商',
    onPrimaryAction: () =>
      showFormDrawer(
        '新增供应商',
        [
          { name: 'supplierName', label: '供应商名称', required: true },
          { name: 'supplierType', label: '供应商类型', type: 'select', required: true, options: [{ label: '生产商', value: 1 }, { label: '贸易商', value: 2 }, { label: '物流服务商', value: 3 }] },
          { name: 'contactName', label: '主联系人', required: true },
          { name: 'contactPhone', label: '手机号', required: true },
          { name: 'contactEmail', label: '邮箱', required: true },
          { name: 'province', label: '省份' },
          { name: 'city', label: '城市' },
          { name: 'currency', label: '结算币种', type: 'select', options: [{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }] },
          { name: 'leadTimeDays', label: '交货周期(天)', type: 'number' },
          { name: 'remark', label: '备注', type: 'textarea' },
        ],
        (values) => createSupplier({ ...values, currency: values.currency || 'CNY' }),
        '供应商已创建',
      ),
    permission: 'srm:supplier:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '草稿', value: 0 },
      { label: '待审核', value: 1 },
      { label: '已通过', value: 2 },
      { label: '已拒绝', value: 3 },
      { label: '已停用', value: 4 },
    ],
    columns: [
      { title: '供应商编码', dataIndex: 'supplierCode', width: 150, fixed: 'left' },
      { title: '供应商名称', dataIndex: 'supplierName', width: 220 },
      { title: '类型', dataIndex: 'supplierType', width: 100, render: (value) => <Tag>{String(value)}</Tag> },
      { title: '联系人', dataIndex: 'contactName', width: 110 },
      { title: '手机号', dataIndex: 'contactPhone', width: 130, render: (value) => maskPhone(String(value)) },
      { title: '评级', dataIndex: 'grade', width: 90, render: (value) => <Tag color={value === 'S' ? 'green' : value === 'A' ? 'blue' : value === 'B' ? 'orange' : 'red'}>{String(value)}</Tag> },
      { title: '评分', dataIndex: 'score', width: 90, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 320,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '查看', onClick: () => showRecordDrawer(`供应商 ${row.supplierName} 详情`, row, () => fetchSupplierDetail(row.id)) },
            { label: '编辑', permission: 'srm:supplier:edit', onClick: () => void openSupplierEditForm(row) },
            { label: '通过', hidden: !statusIn(row.status, ['待审核']), permission: 'srm:supplier:audit', onClick: () => confirmSupplierAudit(row, true) },
            { label: '拒绝', hidden: !statusIn(row.status, ['待审核']), danger: true, permission: 'srm:supplier:audit', onClick: () => confirmSupplierAudit(row, false) },
            { label: '补充', hidden: !statusIn(row.status, ['待审核', '已拒绝']), danger: true, permission: 'srm:supplier:audit', onClick: () => confirmSupplierSupplement(row) },
            { label: '停用', hidden: statusIn(row.status, ['已停用']), danger: true, permission: 'srm:supplier:audit', onClick: () => confirmSupplierDisable(row) },
            { label: '启用', hidden: !statusIn(row.status, ['已停用']), permission: 'srm:supplier:audit', onClick: () => confirmSupplierEnable(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<Supplier>,
  spus: {
    key: 'spus',
    title: '商品 SPU',
    description: '维护商品主档、类目、上架状态、多语言内容和素材入口。',
    breadcrumbs: ['卖家工作台', '商品管理', '商品 SPU'],
    queryKey: ['pim', 'spus'],
    fetcher: fetchSpus,
    rowKey: 'id',
    primaryAction: '新增商品',
    onPrimaryAction: () =>
      showFormDrawer(
        '新增商品 SPU',
        [
          { name: 'spuName', label: '商品名称', required: true },
          { name: 'categoryId', label: '分类 ID', type: 'number', required: true },
          { name: 'categoryPath', label: '分类路径' },
          { name: 'brand', label: '品牌' },
          { name: 'originCountry', label: '原产国' },
          { name: 'material', label: '材质' },
          { name: 'spuDesc', label: '商品描述', type: 'textarea' },
          { name: 'packageDesc', label: '包装描述', type: 'textarea' },
        ],
        createSpu,
        '商品 SPU 已创建',
      ),
    permission: 'pim:spu:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '草稿', value: 0 },
      { label: '待审核', value: 1 },
      { label: '已上架', value: 2 },
      { label: '已下架', value: 3 },
    ],
    columns: [
      { title: 'SPU 编码', dataIndex: 'spuCode', width: 170, fixed: 'left' },
      { title: '商品名称', dataIndex: 'spuName', width: 240 },
      { title: '类目', dataIndex: 'categoryName', width: 140 },
      { title: 'SKU 数', dataIndex: 'skuCount', width: 90, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '创建时间', dataIndex: 'createdAt', width: 140 },
      { title: '操作', width: 180, fixed: 'right', render: (_, row) => actions([{ label: '详情', onClick: () => showRecordDrawer(`商品 ${row.spuName} 详情`, row, () => fetchSpuDetail(row.id)) }, { label: '编辑', permission: 'pim:spu:edit', onClick: () => openSpuEditForm(row) }, { label: row.status === '已上架' ? '下架' : '上架', hidden: !statusIn(row.status, ['待审核', '已上架', '已下架']), permission: 'pim:spu:publish', danger: row.status === '已上架', onClick: () => confirmSpuPublish(row, row.status !== '已上架') }]) },
    ],
  } satisfies CommercialPageConfig<ProductSpu>,
  skus: {
    key: 'skus',
    title: 'SKU 管理',
    description: '维护 SKU 规格、平台价格、状态和跨模块库存引用。',
    breadcrumbs: ['卖家工作台', '商品管理', 'SKU 管理'],
    queryKey: ['pim', 'skus'],
    fetcher: fetchSkus,
    rowKey: 'id',
    primaryAction: '批量生成 SKU',
    onPrimaryAction: openBatchSkuForm,
    permission: 'pim:sku:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '草稿', value: 0 },
      { label: '正常', value: 1 },
    ],
    columns: [
      { title: 'SKU 编码', dataIndex: 'skuCode', width: 160, fixed: 'left' },
      { title: 'SKU 名称', dataIndex: 'skuName', width: 260 },
      { title: '所属 SPU', dataIndex: 'spuName', width: 200 },
      { title: '规格', dataIndex: 'spec', width: 140 },
      { title: '价格', dataIndex: 'salePrice', width: 120, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '状态', dataIndex: 'status', width: 100, render: status },
      { title: '操作', width: 150, fixed: 'right', render: (_, row) => actions([{ label: '查看', permission: 'pim:sku:edit', onClick: () => showRecordDrawer(`SKU ${row.skuCode} 详情`, row, () => fetchSkuDetail(row.id)) }, { label: '价格', permission: 'pim:sku:price', onClick: () => openSkuPriceForm(row) }]) },
    ],
  } satisfies CommercialPageConfig<ProductSku>,
  requisitions: {
    key: 'requisitions',
    title: '采购申请',
    description: '承接安全库存、销售预测与人工发起的采购需求。',
    breadcrumbs: ['卖家工作台', '采购管理', '采购申请'],
    queryKey: ['pms', 'requisitions'],
    fetcher: fetchPurchaseRequisitions,
    rowKey: 'id',
    primaryAction: '新建申请',
    onPrimaryAction: openCreateRequisitionForm,
    permission: 'pms:req:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '草稿', value: 0 },
      { label: '待审核', value: 1 },
      { label: '已通过', value: 2 },
      { label: '已拒绝', value: 3 },
    ],
    columns: [
      { title: '申请单号', dataIndex: 'reqNo', width: 170, fixed: 'left' },
      { title: '申请主题', dataIndex: 'title', width: 260 },
      { title: '申请人', dataIndex: 'applicantName', width: 110 },
      { title: '金额', dataIndex: 'amount', width: 130, align: 'right', render: amount() },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '创建时间', dataIndex: 'createdAt', width: 140 },
      { title: '操作', width: 240, fixed: 'right', render: (_, row) => actions([{ label: '查看', onClick: () => showRecordDrawer(`采购申请 ${row.reqNo} 详情`, row, () => fetchPurchaseRequisitionDetail(row.id)) }, { label: '提交', hidden: !statusIn(row.status, ['草稿', '已拒绝']), permission: 'pms:req:add', onClick: () => confirmPurchaseRequisitionSubmit(row) }, { label: '通过', hidden: !statusIn(row.status, ['待审核']), permission: 'pms:req:audit', onClick: () => confirmPurchaseRequisitionAudit(row, true) }, { label: '拒绝', hidden: !statusIn(row.status, ['待审核']), danger: true, permission: 'pms:req:audit', onClick: () => confirmPurchaseRequisitionAudit(row, false) }, { label: '转采购', hidden: !statusIn(row.status, ['已通过']), permission: 'pms:order:add', onClick: () => void openRequisitionToOrderForm(row) }]) },
    ],
  } satisfies CommercialPageConfig<PurchaseRequisition>,
  inquiries: {
    key: 'inquiries',
    title: '询价管理',
    description: '多供应商报价横向对比，支持价格、时效和评分综合决策。',
    breadcrumbs: ['卖家工作台', '采购管理', '询价管理'],
    queryKey: ['pms', 'inquiries'],
    fetcher: fetchPurchaseInquiries,
    rowKey: 'id',
    primaryAction: '发起询价',
    permission: 'pms:inquiry:add',
    columns: [
      { title: '询价单号', dataIndex: 'inquiryNo', width: 170, fixed: 'left' },
      { title: '供应商', dataIndex: 'supplierName', width: 220 },
      { title: '报价数', dataIndex: 'quotedCount', width: 90, align: 'right' },
      { title: '截止时间', dataIndex: 'deadline', width: 130 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 180, fixed: 'right', render: (_, row) => actions([{ label: '报价对比', onClick: () => showRecordDrawer(`询价单 ${row.inquiryNo} 报价对比`, row, () => comparePurchaseInquiry(row.id)) }, { label: '选定报价', hidden: !statusIn(row.status, ['已报价']), permission: 'pms:inquiry:select', onClick: () => confirmSelectInquiry(row) }]) },
    ],
  } satisfies CommercialPageConfig<PurchaseInquiry>,
  purchaseOrders: {
    key: 'purchaseOrders',
    title: '采购订单',
    description: '跟踪供应商确认、发货、到货、对账和结清状态。',
    breadcrumbs: ['卖家工作台', '采购管理', '采购订单'],
    queryKey: ['pms', 'orders'],
    fetcher: fetchPurchaseOrders,
    rowKey: 'id',
    primaryAction: '新建采购单',
    onPrimaryAction: openCreatePurchaseOrderForm,
    permission: 'pms:order:add',
    statusTabs: purchaseTabs,
    columns: [
      { title: '采购单号', dataIndex: 'orderNo', width: 170, fixed: 'left' },
      { title: '供应商', dataIndex: 'supplierName', width: 220 },
      { title: '采购总额', dataIndex: 'totalAmount', width: 130, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '折合人民币', dataIndex: 'rmbAmount', width: 130, align: 'right', render: amount() },
      { title: '状态', dataIndex: 'status', width: 130, render: status },
      { title: '期望到货', dataIndex: 'expectedArrivalDate', width: 130 },
      { title: '目标仓库', dataIndex: 'warehouse', width: 150 },
      {
        title: '操作',
        width: 340,
        fixed: 'right',
        render: (_, row) => (
          <Space size={2}>
            <Link to={`/pms/order/${row.id}`}>详情</Link>
            {actions([
              { label: '发送', hidden: !statusIn(row.status, ['草稿']), permission: 'pms:order:manage', onClick: () => confirmSendPurchaseOrder(row) },
              { label: '确认', hidden: !statusIn(row.status, ['待供应商确认']), permission: 'pms:order:manage', onClick: () => confirmPurchaseOrderAccepted(row) },
              { label: '发货', hidden: !statusIn(row.status, ['已确认']), permission: 'pms:order:manage', onClick: () => confirmPurchaseOrderShipping(row) },
              { label: '对账', hidden: !statusIn(row.status, ['全部到货']), permission: 'pms:order:manage', onClick: () => confirmPurchaseOrderReconcile(row) },
              { label: '入库', hidden: !statusIn(row.status, ['已确认', '发货中', '部分到货']), permission: 'pms:receipt:confirm', onClick: () => void openPurchaseOrderReceiptForm(row) },
              { label: '取消', hidden: statusIn(row.status, ['已结清', '已取消']), danger: true, permission: 'pms:order:manage', onClick: () => confirmPurchaseOrderCancel(row) },
            ])}
          </Space>
        ),
      },
    ],
  } satisfies CommercialPageConfig<PurchaseOrder>,
  receipts: {
    key: 'receipts',
    title: '采购收货',
    description: '集中查看采购收货记录和待确认入库任务。',
    breadcrumbs: ['卖家工作台', '采购管理', '采购收货'],
    queryKey: ['pms', 'receipts'],
    fetcher: fetchPurchaseReceipts,
    rowKey: 'id',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待质检', value: 0 },
      { label: '入库中', value: 1 },
      { label: '部分入库', value: 2 },
      { label: '全部入库', value: 3 },
      { label: '拒收', value: 4 },
    ],
    columns: [
      { title: '收货单号', dataIndex: 'receiptNo', width: 170 },
      { title: '采购单号', dataIndex: 'poNo', width: 170 },
      { title: '仓库', dataIndex: 'warehouseName', width: 160 },
      { title: '计划数量', dataIndex: 'totalQty', width: 100, align: 'right' },
      { title: '实收数量', dataIndex: 'actualQty', width: 100, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 130, fixed: 'right', render: (_, row) => actions([{ label: '确认入库', hidden: !statusIn(row.status, ['待质检', '入库中', '部分入库']), permission: 'pms:receipt:confirm', onClick: () => confirmPurchaseReceiptInbound(row) }]) },
    ],
  } satisfies CommercialPageConfig<PurchaseReceipt>,
  warehouses: {
    key: 'warehouses',
    title: '仓库库位',
    description: '维护国内仓、海外仓和库位基础信息。',
    breadcrumbs: ['卖家工作台', '仓储库存', '仓库库位'],
    queryKey: ['wms', 'warehouses'],
    fetcher: fetchWarehouses,
    rowKey: 'id',
    primaryAction: '新增仓库',
    onPrimaryAction: () =>
      showFormDrawer(
        '新增仓库',
        [
          { name: 'warehouseCode', label: '仓库编码', required: true },
          { name: 'warehouseName', label: '仓库名称', required: true },
          { name: 'warehouseType', label: '仓库类型', type: 'select', required: true, options: [{ label: '国内仓', value: 1 }, { label: '海外仓', value: 2 }, { label: '虚拟仓', value: 3 }] },
          { name: 'countryCode', label: '国家代码' },
          { name: 'countryName', label: '国家名称' },
          { name: 'city', label: '城市' },
          { name: 'address', label: '详细地址' },
          { name: 'contactName', label: '联系人' },
          { name: 'contactPhone', label: '联系电话' },
          { name: 'status', label: '状态', type: 'select', options: [{ label: '正常', value: 1 }, { label: '停用', value: 0 }] },
        ],
        (values) => createWarehouse({ ...values, status: values.status ?? 1 }),
        '仓库已创建',
      ),
    permission: 'wms:warehouse:add',
    columns: [
      { title: '仓库编码', dataIndex: 'warehouseCode', width: 150 },
      { title: '仓库名称', dataIndex: 'warehouseName', width: 220 },
      { title: '城市', dataIndex: 'city', width: 130 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 150, fixed: 'right', render: (_, row) => actions([{ label: '库位', onClick: () => showRecordDrawer(`${row.warehouseName} 库位列表`, row, () => fetchWarehouseLocations(row.id)) }, { label: '编辑', permission: 'wms:warehouse:edit', onClick: () => openWarehouseEditForm(row) }]) },
    ],
  } satisfies CommercialPageConfig<Warehouse>,
  inventory: {
    key: 'inventory',
    title: '库存总览',
    description: '按 SKU、仓库和库存类型跟踪可售、冻结、在途与安全库存。',
    breadcrumbs: ['卖家工作台', '仓储库存', '库存总览'],
    queryKey: ['wms', 'inventory'],
    fetcher: fetchInventory,
    rowKey: 'id',
    columns: [
      { title: 'SKU 编码', dataIndex: 'skuCode', width: 150, fixed: 'left' },
      { title: '商品名称', dataIndex: 'skuName', width: 240 },
      { title: '仓库', dataIndex: 'warehouse', width: 150 },
      { title: '实物', dataIndex: 'physicalQty', width: 90, align: 'right' },
      { title: '可售', dataIndex: 'availableQty', width: 90, align: 'right' },
      { title: '冻结', dataIndex: 'frozenQty', width: 90, align: 'right' },
      { title: '在途', dataIndex: 'inboundQty', width: 90, align: 'right' },
      { title: '安全库存', dataIndex: 'safetyQty', width: 110, align: 'right' },
      { title: '预警', dataIndex: 'warningStatus', width: 110, render: (value) => <StatusTag value={warningText(String(value))} /> },
      { title: '操作', width: 160, fixed: 'right', render: (_, row) => actions([{ label: '流水', onClick: () => showRecordDrawer(`${row.skuCode} 库存流水`, row, () => fetchInventoryLogs({ pageNum: 1, pageSize: 20, skuCode: row.skuCode, warehouse: row.warehouse }).then((page) => page.records)) }, { label: '调整', permission: 'wms:inventory:adjust', onClick: () => openInventoryAdjustForm(row) }]) },
    ],
  } satisfies CommercialPageConfig<InventoryItem>,
  inbound: {
    key: 'inbound',
    title: '入库单管理',
    description: '处理采购入库、质检、上架和入库确认。',
    breadcrumbs: ['卖家工作台', '仓储库存', '入库单管理'],
    queryKey: ['wms', 'inbound'],
    fetcher: fetchInboundOrders,
    rowKey: 'id',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待入库', value: 0 },
      { label: '入库中', value: 1 },
      { label: '已完成', value: 2 },
    ],
    columns: [
      { title: '入库单号', dataIndex: 'inboundNo', width: 170 },
      { title: '来源单号', dataIndex: 'sourceNo', width: 170 },
      { title: '仓库', dataIndex: 'warehouse', width: 150 },
      { title: 'SKU 数', dataIndex: 'skuCount', width: 90, align: 'right' },
      { title: '计划数量', dataIndex: 'plannedQty', width: 100, align: 'right' },
      { title: '实收数量', dataIndex: 'receivedQty', width: 100, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 160, fixed: 'right', render: (_, row) => actions([{ label: '详情', onClick: () => showRecordDrawer(`入库单 ${row.inboundNo} 明细`, row, () => fetchInboundOrderItems(row.id)) }, { label: '确认入库', hidden: !statusIn(row.status, ['待入库', '入库中']), permission: 'wms:inbound:confirm', onClick: () => confirmInboundReceive(row) }]) },
    ],
  } satisfies CommercialPageConfig<InboundOrder>,
  outbound: {
    key: 'outbound',
    title: '出库单管理',
    description: '承接 OMS 发货任务，跟踪拣货、复核和出库。',
    breadcrumbs: ['卖家工作台', '仓储库存', '出库单管理'],
    queryKey: ['wms', 'outbound'],
    fetcher: fetchOutboundOrders,
    rowKey: 'id',
    statusTabs: [
      { label: '全部', value: null },
      { label: '分配中', value: 0 },
      { label: '待拣货', value: 1 },
      { label: '拣货中', value: 2 },
      { label: '待复核', value: 3 },
      { label: '已出库', value: 4 },
      { label: '已取消', value: 5 },
    ],
    columns: [
      { title: '出库单号', dataIndex: 'outboundNo', width: 170 },
      { title: '订单号', dataIndex: 'orderNo', width: 170 },
      { title: '仓库', dataIndex: 'warehouse', width: 150 },
      { title: '计划数量', dataIndex: 'plannedQty', width: 100, align: 'right' },
      { title: '已出库', dataIndex: 'shippedQty', width: 100, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 160, fixed: 'right', render: (_, row) => actions([{ label: '拣货', onClick: () => showRecordDrawer(`出库单 ${row.outboundNo} 拣货明细`, row, () => fetchOutboundPicklist(row.id)) }, { label: '出库', hidden: !statusIn(row.status, ['待复核']), permission: 'wms:outbound:ship', onClick: () => confirmOutboundShip(row) }]) },
    ],
  } satisfies CommercialPageConfig<OutboundOrder>,
  stocktake: {
    key: 'stocktake',
    title: '库存盘点',
    description: '管理盘点任务、差异复核和库存调整。',
    breadcrumbs: ['卖家工作台', '仓储库存', '库存盘点'],
    queryKey: ['wms', 'stocktake'],
    fetcher: fetchStocktakeTasks,
    rowKey: 'id',
    primaryAction: '新建盘点',
    onPrimaryAction: openCreateStocktakeForm,
    permission: 'wms:stocktake:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待处理', value: 0 },
      { label: '盘点中', value: 1 },
      { label: '待审核差异', value: 2 },
      { label: '已完成', value: 3 },
    ],
    columns: [
      { title: '任务单号', dataIndex: 'taskNo', width: 170 },
      { title: '类型', dataIndex: 'type', width: 130 },
      { title: '仓库', dataIndex: 'warehouse', width: 150 },
      { title: '进度', dataIndex: 'progress', width: 160, render: (value) => <Progress percent={Number(value || 0)} size="small" /> },
      { title: '盘盈', dataIndex: 'profitQty', width: 90, align: 'right' },
      { title: '盘亏', dataIndex: 'lossQty', width: 90, align: 'right' },
      { title: '状态', dataIndex: 'status', width: 120, render: status },
      {
        title: '操作',
        width: 230,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '明细', onClick: () => showRecordDrawer(`盘点 ${row.taskNo} 明细`, row, () => fetchStocktakeItems(row.id)) },
            { label: '实盘', hidden: !statusIn(row.status, ['待处理', '盘点中']), permission: 'wms:inventory:adjust', onClick: () => void openStocktakeCountForm(row) },
            { label: '差异', onClick: () => showRecordDrawer(`盘点 ${row.taskNo} 差异`, row, () => loadStocktakeDiffItems(row.id)) },
            { label: '审核', hidden: !statusIn(row.status, ['待审核差异']), permission: 'wms:inventory:adjust', onClick: () => confirmStocktakeAudit(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<StocktakeTask>,
  orders: {
    key: 'orders',
    title: '销售订单',
    description: '跟踪多平台订单、发货截止、异常和履约状态。',
    breadcrumbs: ['卖家工作台', '订单管理', '销售订单'],
    queryKey: ['oms', 'orders'],
    fetcher: fetchOrders,
    rowKey: 'id',
    statusTabs: orderTabs,
    columns: [
      { title: '内部订单号', dataIndex: 'orderNo', width: 160, fixed: 'left' },
      { title: '平台订单号', dataIndex: 'platformOrderNo', width: 170 },
      { title: '平台', dataIndex: 'platform', width: 100, render: (value) => <Tag>{String(value)}</Tag> },
      { title: '国家', dataIndex: 'buyerCountry', width: 80 },
      { title: '金额', dataIndex: 'amount', width: 120, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '发货截止', dataIndex: 'deliveryDeadline', width: 150 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 260,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '详情', onClick: () => showRecordDrawer(`订单 ${row.orderNo} 详情`, row, async () => ({ ...(await fetchOrderDetail(row.id)), logs: await fetchOrderLogs(row.id) })) },
            { label: '审核', hidden: !statusIn(row.status, ['待处理', '风控审核']), permission: 'oms:order:audit', onClick: () => confirmOrderApprove(row) },
            { label: '同步', hidden: statusIn(row.status, ['已完成', '已取消']), permission: 'oms:order:manage', onClick: () => confirmOrderSync(row) },
            { label: '异常', hidden: statusIn(row.status, ['已完成', '已取消']), danger: true, permission: 'oms:order:manage', onClick: () => confirmOrderFlag(row) },
            { label: '取消', hidden: statusIn(row.status, ['已完成', '已取消']), danger: true, permission: 'oms:order:cancel', onClick: () => confirmOrderCancel(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<Order>,
  refunds: {
    key: 'refunds',
    title: '退款管理',
    description: '处理仅退款、退货退款和售后证据审核。',
    breadcrumbs: ['卖家工作台', '订单管理', '退款管理'],
    queryKey: ['oms', 'refunds'],
    fetcher: fetchRefunds,
    rowKey: 'id',
    columns: [
      { title: '退款单号', dataIndex: 'refundNo', width: 170 },
      { title: '订单号', dataIndex: 'orderNo', width: 160 },
      { title: '类型', dataIndex: 'refundType', width: 110 },
      { title: '金额', dataIndex: 'amount', width: 120, align: 'right', render: amount() },
      { title: '原因', dataIndex: 'reason', width: 240 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 230,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '通过', hidden: !statusIn(row.status, ['待审核']), permission: 'oms:refund:audit', onClick: () => confirmRefundAudit(row, true) },
            { label: '拒绝', hidden: !statusIn(row.status, ['待审核']), danger: true, permission: 'oms:refund:audit', onClick: () => confirmRefundAudit(row, false) },
            { label: '收货', hidden: !statusIn(row.status, ['已通过']), permission: 'oms:refund:audit', onClick: () => confirmRefundReceived(row) },
            { label: '完成', hidden: !statusIn(row.status, ['已通过', '退货已收']), permission: 'oms:refund:audit', onClick: () => confirmRefundComplete(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<Refund>,
  waybills: {
    key: 'waybills',
    title: '运单列表',
    description: '跟踪物流商单号、轨迹状态、费用和异常处理。',
    breadcrumbs: ['卖家工作台', '物流管理', '运单列表'],
    queryKey: ['tms', 'waybills'],
    fetcher: fetchWaybills,
    rowKey: 'id',
    primaryAction: '创建运单',
    onPrimaryAction: openCreateWaybillForm,
    permission: 'tms:waybill:add',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待揽收', value: 0 },
      { label: '已揽收', value: 1 },
      { label: '运输中', value: 2 },
      { label: '到达分拨', value: 3 },
      { label: '清关中', value: 4 },
      { label: '派送中', value: 5 },
      { label: '派件中', value: 6 },
      { label: '已签收', value: 7 },
      { label: '异常', value: 8 },
      { label: '已取消', value: 10 },
    ],
    columns: [
      { title: '运单号', dataIndex: 'waybillNo', width: 160, fixed: 'left' },
      { title: '物流商单号', dataIndex: 'trackingNo', width: 150 },
      { title: '物流商', dataIndex: 'carrierName', width: 110 },
      { title: '渠道', dataIndex: 'channelName', width: 160 },
      { title: '订单号', dataIndex: 'orderNo', width: 150 },
      { title: '当前轨迹', dataIndex: 'currentTrack', width: 240 },
      { title: '运费', dataIndex: 'fee', width: 100, align: 'right', render: (value, row) => formatAmount(Number(value || 0), row.feeCurrency || 'CNY') },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 240,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '轨迹', onClick: () => showRecordDrawer(`运单 ${row.waybillNo} 轨迹`, row, () => fetchWaybillTracks(row.id)) },
            { label: '刷新', hidden: statusIn(row.status, ['已签收', '已取消']), permission: 'tms:waybill:refresh', onClick: () => confirmWaybillRefresh(row) },
            { label: '异常', hidden: statusIn(row.status, ['已签收', '已取消', '异常']), danger: true, permission: 'tms:logistics:manage', onClick: () => openWaybillExceptionForm(row) },
            { label: '取消', hidden: !statusIn(row.status, ['待揽收']), danger: true, permission: 'tms:logistics:manage', onClick: () => confirmWaybillCancel(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<Waybill>,
  channels: {
    key: 'channels',
    title: '物流渠道',
    description: '维护物流商、渠道覆盖国家和启停状态。',
    breadcrumbs: ['卖家工作台', '物流管理', '物流渠道'],
    queryKey: ['tms', 'channels'],
    fetcher: fetchLogisticsChannels,
    rowKey: 'id',
    primaryAction: '新增渠道',
    onPrimaryAction: openCreateChannelForm,
    permission: 'tms:channel:add',
    columns: [
      { title: '渠道名称', dataIndex: 'channelName', width: 180 },
      { title: '物流商', dataIndex: 'carrierName', width: 140 },
      { title: '覆盖国家', dataIndex: 'countryCodes', width: 180 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '操作', width: 150, fixed: 'right', render: (_, row) => actions([{ label: '查看', onClick: () => showRecordDrawer(`物流渠道 ${row.channelName}`, row, () => fetchLogisticsChannels({ pageNum: 1, pageSize: 20, keyword: row.channelName }).then((page) => page.records)) }, { label: '禁用', hidden: !statusIn(row.status, ['正常']), danger: true, permission: 'tms:channel:disable', onClick: () => confirmChannelDisable(row) }]) },
    ],
  } satisfies CommercialPageConfig<LogisticsChannel>,
  payables: {
    key: 'payables',
    title: '应付账款',
    description: '跟踪采购、物流等来源的应付金额、到期日和付款状态。',
    breadcrumbs: ['卖家工作台', '财务管理', '应付账款'],
    queryKey: ['fms', 'payables'],
    fetcher: fetchPayables,
    rowKey: 'id',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待对账', value: 0 },
      { label: '待付款', value: 1 },
      { label: '部分付款', value: 2 },
      { label: '已结清', value: 3 },
      { label: '逾期', value: 4 },
    ],
    columns: [
      { title: '应付单号', dataIndex: 'payableNo', width: 170, fixed: 'left' },
      { title: '来源单号', dataIndex: 'sourceBizNo', width: 160 },
      { title: '供应商', dataIndex: 'supplierName', width: 220 },
      { title: '应付金额', dataIndex: 'amount', width: 130, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '已付金额', dataIndex: 'paidAmount', width: 130, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '到期日', dataIndex: 'dueDate', width: 120 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 220,
        fixed: 'right',
        render: (_, row) => {
          const canApply = row.status === '待对账'
          const canApprove = row.status === '待付款'
          const canPay = ['待付款', '部分付款', '逾期'].includes(row.status) && row.amount > row.paidAmount
          return actions([
            ...(canApply ? [{ label: '申请', permission: 'fms:payable:pay', onClick: () => confirmPayableApply(row) }] : []),
            ...(canApprove ? [{ label: '审批', permission: 'fms:payable:pay', onClick: () => confirmPayableApprove(row) }] : []),
            ...(canPay ? [{ label: '付款', permission: 'fms:payable:pay', onClick: () => confirmPayablePaid(row) }] : []),
            { label: '凭证', onClick: () => showRecordDrawer(`应付单 ${row.payableNo} 付款凭证`, row, () => fetchPayablePayments(row.id)) },
          ])
        },
      },
    ],
  } satisfies CommercialPageConfig<Payable>,
  bills: {
    key: 'bills',
    title: '平台账单',
    description: '上传并解析 Amazon、TikTok、Shopee 等平台结算账单。',
    breadcrumbs: ['卖家工作台', '财务管理', '平台账单'],
    queryKey: ['fms', 'bills'],
    fetcher: fetchBills,
    rowKey: 'id',
    primaryAction: '上传账单',
    onPrimaryAction: openUploadBillForm,
    permission: 'fms:bill:upload',
    statusTabs: [
      { label: '全部', value: null },
      { label: '待解析', value: 0 },
      { label: '解析中', value: 1 },
      { label: '待对账', value: 2 },
      { label: '对账完成', value: 3 },
      { label: '解析失败', value: 4 },
    ],
    columns: [
      { title: '账单号', dataIndex: 'billNo', width: 170 },
      { title: '平台', dataIndex: 'platform', width: 100 },
      { title: '店铺', dataIndex: 'storeName', width: 160 },
      { title: '净到账', dataIndex: 'netAmount', width: 130, align: 'right', render: (value, row) => <AmountDisplay value={Number(value || 0)} currency={row.currency} /> },
      { title: '导入时间', dataIndex: 'importedAt', width: 140 },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      {
        title: '操作',
        width: 190,
        fixed: 'right',
        render: (_, row) =>
          actions([
            { label: '明细', onClick: () => showRecordDrawer(`账单 ${row.billNo} 明细`, row, () => fetchBillItems(row.id)) },
            { label: '解析', hidden: !statusIn(row.status, ['待解析', '解析失败']), permission: 'fms:bill:parse', onClick: () => confirmBillParse(row) },
            { label: '确认', hidden: !statusIn(row.status, ['待对账']), permission: 'fms:bill:parse', onClick: () => confirmBillReconcile(row) },
          ]),
      },
    ],
  } satisfies CommercialPageConfig<Bill>,
  profits: {
    key: 'profits',
    title: '利润报表',
    description: '按 SKU、店铺和平台分析 GMV、成本、费用与净利润率。',
    breadcrumbs: ['卖家工作台', '财务管理', '利润报表'],
    queryKey: ['fms', 'profits'],
    fetcher: fetchProfits,
    rowKey: 'id',
    columns: [
      { title: 'SKU', dataIndex: 'skuCode', width: 150 },
      { title: '平台', dataIndex: 'platform', width: 100 },
      { title: 'GMV', dataIndex: 'gmv', width: 120, align: 'right', render: amount() },
      { title: '采购成本', dataIndex: 'purchaseCost', width: 120, align: 'right', render: amount() },
      { title: '物流费', dataIndex: 'logisticsFee', width: 120, align: 'right', render: amount() },
      { title: '平台费', dataIndex: 'platformFee', width: 120, align: 'right', render: amount() },
      { title: '净利润', dataIndex: 'netProfit', width: 120, align: 'right', render: amount() },
      { title: '净利率', dataIndex: 'netMargin', width: 100, align: 'right', render: (value) => <Tag color={Number(value) < 10 ? 'orange' : 'green'}>{Number(value).toFixed(1)}%</Tag> },
    ],
  } satisfies CommercialPageConfig<ProfitRow>,
  cashflows: {
    key: 'cashflows',
    title: '现金流',
    description: '展示收入、支出和未来 30 天现金流预测。',
    breadcrumbs: ['卖家工作台', '财务管理', '现金流'],
    queryKey: ['fms', 'cashflows'],
    fetcher: fetchCashFlows,
    rowKey: 'id',
    columns: [
      { title: '日期', dataIndex: 'flowDate', width: 130 },
      { title: '类型', dataIndex: 'flowType', width: 100, render: (value) => <Tag color={value === '收入' ? 'green' : 'orange'}>{String(value)}</Tag> },
      { title: '来源单号', dataIndex: 'sourceNo', width: 170 },
      { title: '金额', dataIndex: 'amount', width: 130, align: 'right', render: amount() },
      { title: '备注', dataIndex: 'remark' },
    ],
  } satisfies CommercialPageConfig<CashFlowRow>,
  kpis: {
    key: 'kpis',
    title: 'KPI 大盘',
    description: '统一追踪库存、订单、采购、物流和供应商核心指标。',
    breadcrumbs: ['卖家工作台', '数据分析', 'KPI 大盘'],
    queryKey: ['bi', 'kpis'],
    fetcher: fetchKpiMetrics,
    rowKey: 'id',
    columns: [
      { title: '指标', dataIndex: 'name', width: 180 },
      { title: '当前值', dataIndex: 'value', width: 120, align: 'right', render: (value, row) => `${Number(value).toLocaleString('zh-CN')}${row.unit}` },
      { title: '目标值', dataIndex: 'target', width: 120, align: 'right', render: (value, row) => `${Number(value).toLocaleString('zh-CN')}${row.unit}` },
      { title: '状态', dataIndex: 'status', width: 110, render: status },
      { title: '达成度', width: 220, render: (_, row) => <Progress percent={Math.min(100, Math.round((row.value / Math.max(row.target, 1)) * 100))} size="small" /> },
    ],
  } satisfies CommercialPageConfig<KpiMetric>,
  reorder: {
    key: 'reorder',
    title: '智能补货',
    description: '基于可售库存、预测日销和安全天数生成补货建议。',
    breadcrumbs: ['卖家工作台', '数据分析', '智能补货'],
    queryKey: ['bi', 'reorder'],
    fetcher: fetchReorderSuggestions,
    rowKey: 'id',
    columns: [
      { title: 'SKU', dataIndex: 'skuCode', width: 150 },
      { title: '商品名称', dataIndex: 'skuName', width: 260 },
      { title: '可售库存', dataIndex: 'availableQty', width: 110, align: 'right' },
      { title: '预测日销', dataIndex: 'forecastDailySales', width: 110, align: 'right' },
      { title: '建议补货', dataIndex: 'suggestedQty', width: 110, align: 'right' },
      { title: '紧急程度', dataIndex: 'urgency', width: 120, render: (value) => <Tag color={value === '紧急' ? 'red' : value === '较急' ? 'orange' : 'green'}>{String(value)}</Tag> },
      { title: '操作', width: 170, fixed: 'right', render: (_, row) => actions([{ label: '转采购申请', permission: 'pms:req:add', onClick: () => confirmReorderToPurchase(row) }]) },
    ],
  } satisfies CommercialPageConfig<ReorderSuggestion>,
}
