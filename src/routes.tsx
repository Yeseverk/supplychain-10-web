import {
  AppstoreOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  DollarOutlined,
  HomeOutlined,
  InboxOutlined,
  MessageOutlined,
  ProductOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { RouteMenuItem } from './types'

export const routeMeta: Record<string, { title: string; breadcrumbs: string[]; permission?: string }> = {
  '/dashboard': { title: '首页 Dashboard', breadcrumbs: ['卖家工作台', '首页'] },
  '/srm/supplier': { title: '供应商列表', breadcrumbs: ['卖家工作台', '供应商管理', '供应商列表'], permission: 'srm:supplier:list' },
  '/pim/spu': { title: '商品 SPU', breadcrumbs: ['卖家工作台', '商品管理', '商品 SPU'], permission: 'pim:spu:list' },
  '/pim/sku': { title: 'SKU 管理', breadcrumbs: ['卖家工作台', '商品管理', 'SKU 管理'], permission: 'pim:sku:list' },
  '/pms/requisition': { title: '采购申请', breadcrumbs: ['卖家工作台', '采购管理', '采购申请'], permission: 'pms:req:list' },
  '/pms/inquiry': { title: '询价管理', breadcrumbs: ['卖家工作台', '采购管理', '询价管理'], permission: 'pms:inquiry:list' },
  '/pms/order': { title: '采购订单', breadcrumbs: ['卖家工作台', '采购管理', '采购订单'], permission: 'pms:order:list' },
  '/pms/payable': { title: '采购应付', breadcrumbs: ['卖家工作台', '采购管理', '采购应付'], permission: 'fms:payable:list' },
  '/wms/warehouse': { title: '仓库库位', breadcrumbs: ['卖家工作台', '仓储库存', '仓库库位'], permission: 'wms:warehouse:list' },
  '/wms/inventory': { title: '库存总览', breadcrumbs: ['卖家工作台', '仓储库存', '库存总览'], permission: 'wms:inventory:list' },
  '/wms/inbound': { title: '入库单管理', breadcrumbs: ['卖家工作台', '仓储库存', '入库单管理'], permission: 'wms:inbound:list' },
  '/wms/outbound': { title: '出库单管理', breadcrumbs: ['卖家工作台', '仓储库存', '出库单管理'], permission: 'wms:outbound:list' },
  '/wms/stocktake': { title: '库存盘点', breadcrumbs: ['卖家工作台', '仓储库存', '库存盘点'], permission: 'wms:stocktake:list' },
  '/oms/order': { title: '销售订单', breadcrumbs: ['卖家工作台', '订单管理', '销售订单'], permission: 'oms:order:list' },
  '/oms/refund': { title: '退款管理', breadcrumbs: ['卖家工作台', '订单管理', '退款管理'], permission: 'oms:refund:list' },
  '/tms/waybill': { title: '运单列表', breadcrumbs: ['卖家工作台', '物流管理', '运单列表'], permission: 'tms:waybill:list' },
  '/tms/channel': { title: '物流渠道', breadcrumbs: ['卖家工作台', '物流管理', '物流渠道'], permission: 'tms:channel:list' },
  '/tms/recommend': { title: '渠道推荐', breadcrumbs: ['卖家工作台', '物流管理', '渠道推荐'], permission: 'tms:recommend:use' },
  '/fms/payable': { title: '应付账款', breadcrumbs: ['卖家工作台', '财务管理', '应付账款'], permission: 'fms:payable:list' },
  '/fms/bill': { title: '平台账单', breadcrumbs: ['卖家工作台', '财务管理', '平台账单'], permission: 'fms:bill:list' },
  '/fms/profit': { title: '利润报表', breadcrumbs: ['卖家工作台', '财务管理', '利润报表'], permission: 'fms:profit:view' },
  '/fms/cashflow': { title: '现金流', breadcrumbs: ['卖家工作台', '财务管理', '现金流'], permission: 'fms:cashflow:view' },
  '/bi/kpi': { title: 'KPI 大盘', breadcrumbs: ['卖家工作台', '数据分析', 'KPI 大盘'], permission: 'bi:kpi:view' },
  '/bi/reorder': { title: '智能补货', breadcrumbs: ['卖家工作台', '数据分析', '智能补货'], permission: 'bi:reorder:view' },
  '/bi/ai': { title: 'AI 智能查询', breadcrumbs: ['卖家工作台', '数据分析', 'AI 智能查询'], permission: 'bi:ai:use' },
  '/system/user': { title: '用户管理', breadcrumbs: ['卖家工作台', '系统设置', '用户管理'], permission: 'system:user:list' },
  '/system/role': { title: '角色权限', breadcrumbs: ['卖家工作台', '系统设置', '角色权限'], permission: 'system:role:list' },
  '/system/message': { title: '消息中心', breadcrumbs: ['卖家工作台', '系统设置', '消息中心'], permission: 'system:message:manage' },
}

export const menuTree: RouteMenuItem[] = [
  { key: '/dashboard', path: '/dashboard', icon: <DashboardOutlined />, label: '首页 Dashboard' },
  {
    key: 'srm',
    icon: <SafetyCertificateOutlined />,
    label: '供应商管理 SRM',
    children: [{ key: '/srm/supplier', path: '/srm/supplier', label: '供应商列表', permission: 'srm:supplier:list' }],
  },
  {
    key: 'pim',
    icon: <ProductOutlined />,
    label: '商品管理 PIM',
    children: [
      { key: '/pim/spu', path: '/pim/spu', label: '商品 SPU', permission: 'pim:spu:list' },
      { key: '/pim/sku', path: '/pim/sku', label: 'SKU 管理', permission: 'pim:sku:list' },
    ],
  },
  {
    key: 'pms',
    icon: <ShoppingCartOutlined />,
    label: '采购管理 PMS',
    children: [
      { key: '/pms/requisition', path: '/pms/requisition', label: '采购申请', permission: 'pms:req:list' },
      { key: '/pms/inquiry', path: '/pms/inquiry', label: '询价管理', permission: 'pms:inquiry:list' },
      { key: '/pms/order', path: '/pms/order', label: '采购订单', permission: 'pms:order:list' },
      { key: '/pms/payable', path: '/pms/payable', label: '采购应付', permission: 'fms:payable:list' },
    ],
  },
  {
    key: 'wms',
    icon: <InboxOutlined />,
    label: '仓储库存 WMS',
    children: [
      { key: '/wms/warehouse', path: '/wms/warehouse', label: '仓库库位', permission: 'wms:warehouse:list' },
      { key: '/wms/inventory', path: '/wms/inventory', label: '库存总览', permission: 'wms:inventory:list' },
      { key: '/wms/inbound', path: '/wms/inbound', label: '入库单管理', permission: 'wms:inbound:list' },
      { key: '/wms/outbound', path: '/wms/outbound', label: '出库单管理', permission: 'wms:outbound:list' },
      { key: '/wms/stocktake', path: '/wms/stocktake', label: '库存盘点', permission: 'wms:stocktake:list' },
    ],
  },
  {
    key: 'oms',
    icon: <AppstoreOutlined />,
    label: '订单管理 OMS',
    children: [
      { key: '/oms/order', path: '/oms/order', label: '销售订单', permission: 'oms:order:list' },
      { key: '/oms/refund', path: '/oms/refund', label: '退款管理', permission: 'oms:refund:list' },
    ],
  },
  {
    key: 'tms',
    icon: <TruckOutlined />,
    label: '物流管理 TMS',
    children: [
      { key: '/tms/waybill', path: '/tms/waybill', label: '运单列表', permission: 'tms:waybill:list' },
      { key: '/tms/channel', path: '/tms/channel', label: '物流渠道', permission: 'tms:channel:list' },
      { key: '/tms/recommend', path: '/tms/recommend', label: '渠道推荐', permission: 'tms:recommend:use' },
    ],
  },
  {
    key: 'fms',
    icon: <DollarOutlined />,
    label: '财务管理 FMS',
    children: [
      { key: '/fms/payable', path: '/fms/payable', label: '应付账款', permission: 'fms:payable:list' },
      { key: '/fms/bill', path: '/fms/bill', label: '平台账单', permission: 'fms:bill:list' },
      { key: '/fms/profit', path: '/fms/profit', label: '利润报表', permission: 'fms:profit:view' },
      { key: '/fms/cashflow', path: '/fms/cashflow', label: '现金流', permission: 'fms:cashflow:view' },
    ],
  },
  {
    key: 'bi',
    icon: <BarChartOutlined />,
    label: '数据分析 BI',
    children: [
      { key: '/bi/kpi', path: '/bi/kpi', label: 'KPI 大盘', permission: 'bi:kpi:view' },
      { key: '/bi/reorder', path: '/bi/reorder', label: '智能补货', permission: 'bi:reorder:view' },
      { key: '/bi/ai', path: '/bi/ai', label: 'AI 智能查询', permission: 'bi:ai:use' },
    ],
  },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/system/user', path: '/system/user', label: '用户管理', icon: <UserOutlined />, permission: 'system:user:list' },
      { key: '/system/role', path: '/system/role', label: '角色权限', icon: <CalculatorOutlined />, permission: 'system:role:list' },
      { key: '/system/message', path: '/system/message', label: '消息中心', icon: <MessageOutlined />, permission: 'system:message:manage' },
    ],
  },
]

export const defaultOpenKeys = ['srm', 'pim', 'pms', 'wms', 'oms', 'tms', 'fms', 'bi', 'system']

export const homeIcon = <HomeOutlined />
