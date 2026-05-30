import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const backendRoot = path.resolve(root, '..', 'supplychain-10')

function readFile(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return []
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'target' && entry.name !== 'node_modules') result.push(...walk(full, predicate))
    else if (entry.isFile() && predicate(full)) result.push(full)
  }
  return result
}

function normalize(source) {
  return source.replace(/`/g, '').toLowerCase()
}

function unique(items) {
  return [...new Set(items)].sort()
}

const sqlDir = path.join(backendRoot, 'sql')
const sqlFiles = walk(sqlDir, (file) => file.endsWith('.sql'))
const allSql = normalize(sqlFiles.map(readFile).join('\n'))
const backendJava = walk(backendRoot, (file) => file.endsWith('.java') && file.includes(`${path.sep}src${path.sep}main${path.sep}`))
const allJava = backendJava.map(readFile).join('\n')
const frontendApi = walk(path.join(root, 'src', 'api'), (file) => file.endsWith('.ts')).map(readFile).join('\n')
const pageConfig = readFile(path.join(root, 'src', 'pages', 'commercial', 'pageConfigs.tsx'))
const routes = readFile(path.join(root, 'src', 'routes.tsx'))

const requiredSqlFiles = [
  '09_wms_day04_schema.sql',
  '10_pim_oms_day05_schema.sql',
  '11_tms_day06_schema.sql',
  '12_fms_bi_day07_schema.sql',
  '13_security_saas_day08_schema.sql',
  '14_frontend_mvp_permissions.sql',
  '16_mvp_demo_data_zh_names.sql',
  '17_rbac_warehouse_specialist.sql',
]

const requiredTables = [
  'sys_tenant',
  'sys_user',
  'sys_role',
  'sys_menu',
  'sys_role_menu',
  'sys_user_role',
  'supplier',
  'product_spu',
  'product_sku',
  'purchase_requisition',
  'purchase_order',
  'warehouse',
  'inventory',
  'inbound_order',
  'outbound_order',
  'stocktake_task',
  'order_main',
  'order_refund',
  'logistics_channel',
  'logistics_waybill',
  'finance_payable',
  'finance_payment_record',
  'finance_platform_bill',
]

const criticalEndpoints = [
  '/api/system/roles/{id}/menus',
  '/api/system/users/{id}/roles',
  '/api/fms/payables',
  '/api/fms/payables/{payableId}/pay',
  '/api/fms/payables/{payableId}/payments',
  '/api/fms/bills/upload',
  '/api/bi/reorder/to-purchase',
  '/api/pms/inquiries',
  '/api/wms/inbound/{id}/confirm',
  '/api/wms/outbound/{id}/confirm',
  '/api/tms/waybills',
]

const requiredPermissions = [
  'wms:warehouse:manage',
  'wms:inventory:list',
  'wms:inbound:manage',
  'wms:outbound:manage',
  'wms:stocktake:audit',
  'sys:user:list',
  'sys:user:edit',
  'sys:role:manage',
  'sys:message:manage',
  'fms:payable:pay',
  'pms:inquiry:add',
]

const queryObjects = [
  ['supplychain-finance/src/main/java/com/lyf/supplychain/finance/request/FinancePayablePageQuery.java', ['Integer status'], [['String keyword']]],
  ['supplychain-finance/src/main/java/com/lyf/supplychain/finance/request/FinanceBillPageQuery.java', ['Integer status'], [['String keyword']]],
  ['supplychain-warehouse/src/main/java/com/lyf/supplychain/warehouse/request/WmsPageQuery.java', ['Integer status'], [['String keyword']]],
  ['supplychain-purchase/src/main/java/com/lyf/supplychain/purchase/request/PurchaseRequisitionPageQuery.java', ['Integer status'], [['String keyword'], ['String reqNo', 'String title']]],
  ['supplychain-purchase/src/main/java/com/lyf/supplychain/purchase/request/PurchaseInquiryPageQuery.java', ['Integer status'], [['String keyword']]],
  ['supplychain-purchase/src/main/java/com/lyf/supplychain/purchase/request/PurchaseOrderPageQuery.java', ['Integer status'], [['String keyword'], ['String poNo']]],
]

const existingSqlNames = new Set(sqlFiles.map((file) => path.basename(file)))
const missingSqlFiles = requiredSqlFiles.filter((file) => !existingSqlNames.has(file))
const missingTables = requiredTables.filter((table) => !allSql.includes(table))
const permissionAliasesSource = readFile(path.join(root, 'src', 'utils', 'permissions.ts'))
const permissionAliasMap = new Map(
  [...permissionAliasesSource.matchAll(/['"`]([^'"`]+)['"`]:\s*\[([^\]]*)\]/g)].map((match) => [
    match[1],
    [...match[2].matchAll(/['"`]([^'"`]+)['"`]/g)].map((alias) => alias[1]),
  ]),
)
const permissionKnown = (permission) => [permission, ...(permissionAliasMap.get(permission) || [])].some((candidate) => allSql.includes(candidate.toLowerCase()))
const missingSeedPermissions = requiredPermissions.filter((permission) => !permissionKnown(permission))
const frontendPermissions = unique([...pageConfig.matchAll(/permission:\s*['"`]([^'"`]+)['"`]/g), ...routes.matchAll(/permission:\s*['"`]([^'"`]+)['"`]/g)].map((match) => match[1]))
const frontendPermissionsMissingInSql = frontendPermissions.filter((permission) => !permissionKnown(permission))

function endpointCovered(endpoint) {
  const parts = endpoint.split('/').filter(Boolean).filter((part) => !part.startsWith('{'))
  return parts.every((part) => allJava.includes(part))
}

const missingBackendEndpointHints = criticalEndpoints.filter((endpoint) => !endpointCovered(endpoint))
const missingFrontendEndpointCalls = criticalEndpoints.filter((endpoint) => {
  const normalized = endpoint.replace(/\{id\}|\{payableId\}/g, '${')
  const stableParts = normalized.split('/').filter(Boolean).filter((part) => !part.includes('${'))
  return !stableParts.every((part) => frontendApi.includes(part))
})

const queryIssues = queryObjects.flatMap(([relative, requiredFields, keywordAlternatives]) => {
  const source = readFile(path.join(backendRoot, ...relative.split('/')))
  if (!source) return [`missing query object: ${relative}`]
  const issues = requiredFields.filter((field) => !source.includes(field)).map((field) => `${relative} missing ${field}`)
  const hasKeywordShape = keywordAlternatives.some((fields) => fields.every((field) => source.includes(field)))
  if (!hasKeywordShape) issues.push(`${relative} missing keyword or domain keyword fields`)
  return issues
})

const warehouseSpecialistSeeded = allSql.includes('role_warehouse_specialist') && allSql.includes('warehouse@flexchain.local')
const sellerTenantSeeded = allSql.includes('tc-20260528-7012') || allSql.includes('flexchain')

const result = {
  sqlFiles: sqlFiles.length,
  backendJavaFiles: backendJava.length,
  requiredSqlFiles: requiredSqlFiles.length,
  missingSqlFiles,
  requiredTables: requiredTables.length,
  missingTables,
  requiredPermissions: requiredPermissions.length,
  missingSeedPermissions,
  frontendPermissionCount: frontendPermissions.length,
  frontendPermissionsMissingInSql,
  criticalEndpoints: criticalEndpoints.length,
  missingBackendEndpointHints,
  missingFrontendEndpointCalls,
  queryIssues,
  warehouseSpecialistSeeded,
  sellerTenantSeeded,
}

console.log(JSON.stringify(result, null, 2))

const failures = []
if (missingSqlFiles.length) failures.push(`missing SQL files: ${missingSqlFiles.join(', ')}`)
if (missingTables.length) failures.push(`missing required table definitions/seeds: ${missingTables.join(', ')}`)
if (missingSeedPermissions.length) failures.push(`missing required seed permissions: ${missingSeedPermissions.join(', ')}`)
if (frontendPermissionsMissingInSql.length) failures.push(`frontend permissions missing in SQL seeds: ${frontendPermissionsMissingInSql.join(', ')}`)
if (missingBackendEndpointHints.length) failures.push(`critical endpoint hints not found in backend controllers: ${missingBackendEndpointHints.join(', ')}`)
if (missingFrontendEndpointCalls.length) failures.push(`critical endpoint calls not found in frontend API layer: ${missingFrontendEndpointCalls.join(', ')}`)
if (queryIssues.length) failures.push(`query object issues: ${queryIssues.join(', ')}`)
if (!warehouseSpecialistSeeded) failures.push('warehouse specialist role/user seed not detected')
if (!sellerTenantSeeded) failures.push('seller tenant demo seed not detected')

if (failures.length) {
  console.error(`DB_INTERFACE_AUDIT_FAILED\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('DB_INTERFACE_AUDIT_OK')
