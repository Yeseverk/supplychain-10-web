const permissionAliases: Record<string, string[]> = {
  'pim:spu:list': ['pim:product:manage'],
  'pim:spu:add': ['pim:product:manage'],
  'pim:spu:edit': ['pim:product:manage'],
  'pim:spu:publish': ['pim:product:manage'],
  'pim:sku:list': ['pim:product:manage'],
  'pim:sku:add': ['pim:product:manage'],
  'pim:sku:edit': ['pim:product:manage'],
  'pim:sku:price': ['pim:product:manage'],

  'pms:req:list': ['pms:order:list', 'pms:order:manage'],
  'pms:req:add': ['pms:order:manage'],
  'pms:req:audit': ['pms:requisition:audit', 'pms:order:manage'],
  'pms:inquiry:list': ['pms:order:list', 'pms:order:manage'],
  'pms:inquiry:add': ['pms:order:manage'],
  'pms:inquiry:select': ['pms:order:manage'],
  'pms:order:add': ['pms:order:manage'],

  'wms:warehouse:list': ['wms:warehouse:manage'],
  'wms:warehouse:add': ['wms:warehouse:manage'],
  'wms:warehouse:edit': ['wms:warehouse:manage'],
  'wms:inbound:list': ['wms:inbound:manage'],
  'wms:inbound:confirm': ['wms:inbound:manage', 'pms:receipt:confirm'],
  'wms:outbound:list': ['wms:outbound:manage'],
  'wms:outbound:ship': ['wms:outbound:manage'],
  'wms:stocktake:list': ['wms:stocktake:audit'],
  'wms:stocktake:add': ['wms:stocktake:audit'],

  'oms:order:audit': ['oms:order:manage'],
  'oms:order:cancel': ['oms:order:manage'],
  'oms:refund:list': ['oms:order:manage'],
  'oms:refund:audit': ['oms:order:manage'],

  'tms:waybill:list': ['tms:waybill:add', 'tms:logistics:manage'],
  'tms:waybill:refresh': ['tms:logistics:manage'],
  'tms:channel:list': ['tms:logistics:manage'],
  'tms:channel:add': ['tms:logistics:manage'],
  'tms:channel:disable': ['tms:logistics:manage'],
  'tms:recommend:use': ['tms:logistics:manage'],

  'fms:payable:list': ['fms:bill:import', 'fms:profit:view'],
  'fms:payable:pay': ['fms:bill:import'],
  'fms:bill:list': ['fms:bill:import'],
  'fms:bill:upload': ['fms:bill:import'],
  'fms:bill:parse': ['fms:bill:import'],
  'fms:cashflow:view': ['fms:profit:view'],

  'bi:kpi:view': ['bi:dashboard:view'],
  'bi:reorder:view': ['bi:dashboard:view'],
  'bi:ai:use': ['bi:dashboard:view'],

  'system:user:list': ['sys:user:list'],
  'system:user:edit': ['sys:user:edit'],
  'system:role:list': ['sys:role:manage'],
  'system:message:manage': ['sys:message:manage'],
}

export function hasPermission(permissions: string[] | undefined, _roles: string[] | undefined, permission?: string) {
  if (!permission) return true
  if (permissions?.includes('*') || permissions?.includes(permission)) return true
  return permissionAliases[permission]?.some((alias) => permissions?.includes(alias)) || false
}
