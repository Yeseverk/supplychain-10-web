import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const backendRoot = path.resolve(root, '..', 'supplychain-10')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function listFiles(dir, suffix) {
  const absolute = path.join(root, dir)
  const result = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name)
    if (entry.isDirectory()) result.push(...listFiles(path.relative(root, full), suffix))
    else if (entry.name.endsWith(suffix)) result.push(path.relative(root, full))
  }
  return result
}

function unique(items) {
  return [...new Set(items)].sort()
}

function extract(regex, source, group = 1) {
  return [...source.matchAll(regex)].map((match) => match[group])
}

function normalizeEndpoint(endpoint) {
  return endpoint
    .replace(/`/g, '')
    .replace(/\$\{[^}]+\}/g, '{id}')
    .replace(/\/\{[^}]+\}/g, '/{id}')
    .replace(/\{id\}\/\$\{[^}]+\}/g, '{id}/{action}')
}

const pageConfig = read('src/pages/commercial/pageConfigs.tsx')
const commercialListPage = read('src/pages/commercial/CommercialListPage.tsx')
const actionPages = read('src/pages/commercial/ActionPages.tsx')
const realActionPages = read('src/pages/commercial/RealActionPages.tsx')
const requestApi = read('src/api/request.ts')
const packageJson = JSON.parse(read('package.json'))

const primaryActions = extract(/primaryAction:\s*['"`]([^'"`]+)['"`]/g, pageConfig)
const missingPrimaryHandlers = [...pageConfig.matchAll(/primaryAction:\s*['"`]([^'"`]+)['"`]/g)]
  .filter((match) => !pageConfig.slice(match.index, match.index + 500).includes('onPrimaryAction'))
  .map((match) => match[1])
const visibleTechnicalFields = [...pageConfig.matchAll(/\{ name: ['"`]([^'"`]+)['"`], label: ['"`]([^'"`]+)['"`]([^}]*)\}/g)]
  .filter((match) => !match[3].includes("type: 'hidden'") && (/\bID\b| ID|JSON/i.test(match[2])))
  .map((match) => `${match[2]}(${match[1]})`)

const actionHelper = pageConfig.slice(pageConfig.indexOf('const actions ='), pageConfig.indexOf('const amount ='))
const actionButtonStyled = actionHelper.includes('commercial-action-button') && actionHelper.includes('size="small"') && !actionHelper.includes('type="link"')
const actionNoDashFallback = !actionHelper.includes('>-</Typography.Text>') && actionHelper.includes('commercial-action-empty')
const recordDetailUsesModal = commercialListPage.includes('<Modal') && commercialListPage.includes('className="record-modal"') && commercialListPage.includes('width="min(800px, calc(100vw - 48px))"') && !commercialListPage.includes('<Drawer title={drawer')
const requiredRecordLabels = [
  'payableId',
  'paymentAmount',
  'paymentDate',
  'paymentMethod',
  'voucherNo',
  'operatorName',
  'reqNo',
  'applicantName',
  'poNo',
  'inboundNo',
  'outboundNo',
  'waybillNo',
  'salePrice',
]
const missingRecordLabels = requiredRecordLabels.filter((key) => !commercialListPage.includes(`${key}:`))
const recordModalPolished =
  commercialListPage.includes('recordColumnWidth') &&
  commercialListPage.includes('labelText(key)') &&
  commercialListPage.includes('scroll={{ x: Math.max(tableWidth, 760) }}')
const actionColumnWidthGuard = commercialListPage.includes("column.title === '操作'") && commercialListPage.includes('Math.max(Number(column.width || 0), 260)')
const systemPagesUseModal = !actionPages.includes('<Drawer') && actionPages.includes('className="record-modal form-modal"') && actionPages.includes('permission-modal')
const systemActionButtonsStyled = !actionPages.includes('type="link"') && actionPages.includes('commercial-action-button') && actionPages.includes('commercial-action-group')
const systemMutationRefreshCoverage =
  actionPages.includes('saveUserRolesMutation') &&
  actionPages.includes('saveRoleMenusMutation') &&
  actionPages.includes('markReadMutation') &&
  (actionPages.match(/void refetch\(\)/g) || []).length >= 6
const aiResultTablePolished = realActionPages.includes('aiResultFieldLabels') && realActionPages.includes('aiResultLabel(key)') && realActionPages.includes('aiResultColumnWidth(key)')
const recordDetailSingleColumn = commercialListPage.includes('column={1}')
const mutationRefreshCoverage =
  commercialListPage.includes('void refetch()') &&
  pageConfig.includes('function confirmAsyncAction') &&
  pageConfig.slice(pageConfig.indexOf('function confirmAsyncAction'), pageConfig.indexOf('function confirmOrderApprove')).includes('refreshCurrentTable()')
const dangerActionIssues = [...pageConfig.matchAll(/\{[^{}]*danger:\s*true[^{}]*onClick:\s*\(\)\s*=>\s*([^,}]+)[^{}]*\}/g)]
  .map((match) => match[1].trim())
  .filter((handler) => !/^(confirm|open[A-Z].*Form|void open[A-Z].*Form)/.test(handler))

const pagePermissions = unique(extract(/permission:\s*['"`]([^'"`]+)['"`]/g, pageConfig))
const routePermissions = unique(extract(/permission:\s*['"`]([^'"`]+)['"`]/g, read('src/routes.tsx')))
const aliases = read('src/utils/permissions.ts')
const aliasKeys = extract(/['"`]([^'"`]+)['"`]:\s*\[/g, aliases)
const aliasValues = extract(/['"`]([^'"`]+)['"`]/g, aliases).filter((item) => item.includes(':'))
const backendPermissionTexts = []
if (fs.existsSync(backendRoot)) {
  for (const relative of [
    'supplychain-common/supplychain-common-core/src/main/java/com/lyf/supplychain/common/security/constant/PermissionCodes.java',
    'sql/02_init_data.sql',
    'sql/13_security_saas_day08_schema.sql',
    'sql/14_frontend_mvp_permissions.sql',
    'sql/17_rbac_warehouse_specialist.sql',
  ]) {
    const file = path.join(backendRoot, ...relative.split('/'))
    if (fs.existsSync(file)) backendPermissionTexts.push(fs.readFileSync(file, 'utf8'))
  }
}
const backendPermissions = backendPermissionTexts.flatMap((source) => extract(/['"`]([a-z]+:[a-z0-9-]+:[a-z0-9-]+)['"`]/g, source))
const knownPermissions = new Set([...aliasKeys, ...aliasValues, ...backendPermissions, '*'])
const unknownPermissions = unique([...pagePermissions, ...routePermissions].filter((permission) => !knownPermissions.has(permission)))

const apiFiles = listFiles('src/api', '.ts')
const frontendEndpoints = unique(
  apiFiles.flatMap((file) => {
    const source = read(file)
    return extract(/url:\s*(`[^`]+`|'[^']+'|"[^"]+")/g, source).map((url) => normalizeEndpoint(url.slice(1, -1)))
  }),
)

const mockImports = apiFiles
  .filter((file) => read(file).includes("../data/mock") || read(file).includes("'../data/mock'"))
  .filter((file) => file.replaceAll('\\', '/') !== 'src/api/auth.ts')

const mockFallbackExplicitOnly =
  requestApi.includes("VITE_ENABLE_MOCK_FALLBACK === 'true'") &&
  requestApi.includes('import.meta.env.DEV') &&
  !requestApi.includes('VITE_ENABLE_MOCK_FALLBACK !==')

const backendMappings = []
if (fs.existsSync(backendRoot)) {
  const backendFiles = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'target') walk(full)
      else if (entry.isFile() && entry.name.endsWith('Controller.java')) backendFiles.push(full)
    }
  }
  walk(backendRoot)
  for (const file of backendFiles) {
    const source = fs.readFileSync(file, 'utf8')
    backendMappings.push(...extract(/@(?:Get|Post|Put|Delete|Patch)Mapping\((?:\{)?\s*"([^"]+)"/g, source))
    backendMappings.push(...extract(/@(?:Get|Post|Put|Delete|Patch)Mapping\(\s*value\s*=\s*"([^"]+)"/g, source))
    backendMappings.push(...extract(/@(?:Get|Post|Put|Delete|Patch)Mapping\s*$/gm, source).map(() => ''))
  }
}

const importantEndpoints = [
  '/api/fms/payables',
  '/api/fms/payables/{id}/pay',
  '/api/fms/bills/upload',
  '/api/bi/ai/query',
  '/api/tms/recommend',
  '/api/system/roles/{id}/menus',
  '/api/system/users/{id}/roles',
  '/api/pms/requisitions/{id}/submit',
  '/api/pms/orders/{id}/cancel',
  '/api/wms/inbound/{id}/confirm',
  '/api/wms/outbound/{id}/confirm',
  '/api/tms/waybills/{id}/cancel',
]

const missingImportantEndpointCalls = importantEndpoints.filter((endpoint) => !frontendEndpoints.includes(endpoint))

const result = {
  primaryActions: primaryActions.length,
  missingPrimaryHandlers,
  visibleTechnicalFields,
  pagePermissions: pagePermissions.length,
  routePermissions: routePermissions.length,
  unknownPermissions,
  frontendEndpoints: frontendEndpoints.length,
  importantEndpointCallsCovered: importantEndpoints.length - missingImportantEndpointCalls.length,
  missingImportantEndpointCalls,
  mockFallbackExplicitOnly,
  mockFallbackFiles: mockImports,
  scriptsPresent: {
    chain: Boolean(packageJson.scripts?.['audit:chain']),
    purchaseChain: Boolean(packageJson.scripts?.['audit:purchase-chain']),
    rbac: Boolean(packageJson.scripts?.['audit:rbac']),
    db: Boolean(packageJson.scripts?.['audit:db']),
  },
  actionButtonStyled,
  actionNoDashFallback,
  actionColumnWidthGuard,
  systemPagesUseModal,
  systemActionButtonsStyled,
  systemMutationRefreshCoverage,
  aiResultTablePolished,
  recordDetailUsesModal,
  recordModalPolished,
  missingRecordLabels,
  mutationRefreshCoverage,
  dangerActionIssues,
  backendControllersDetected: backendMappings.length,
}

console.log(JSON.stringify(result, null, 2))

const failures = []
if (missingPrimaryHandlers.length) failures.push(`primary actions without handlers: ${missingPrimaryHandlers.join(', ')}`)
if (visibleTechnicalFields.length) failures.push(`visible technical form fields: ${visibleTechnicalFields.join(', ')}`)
if (unknownPermissions.length) failures.push(`permissions without alias/base mapping: ${unknownPermissions.join(', ')}`)
if (missingImportantEndpointCalls.length) failures.push(`missing important endpoint calls: ${missingImportantEndpointCalls.join(', ')}`)
if (!mockFallbackExplicitOnly) failures.push('mock fallback is not guarded by explicit VITE_ENABLE_MOCK_FALLBACK=true')
if (!result.scriptsPresent.chain || !result.scriptsPresent.purchaseChain || !result.scriptsPresent.rbac || !result.scriptsPresent.db) failures.push('core audit scripts are not all wired')
if (!actionButtonStyled) failures.push('commercial table action buttons are not using the unified small button style')
if (!actionNoDashFallback) failures.push('commercial action empty state still uses dash text')
if (!actionColumnWidthGuard) failures.push('commercial action columns do not have a minimum width guard')
if (!systemPagesUseModal) failures.push('system/rbac/message pages still contain Drawer or do not use standard modal styling')
if (!systemActionButtonsStyled) failures.push('system/rbac/message action buttons still use link style or miss unified styling')
if (!systemMutationRefreshCoverage) failures.push('system/rbac/message mutations do not refresh after success')
if (!aiResultTablePolished) failures.push('AI result table still uses raw backend keys as column titles')
if (!recordDetailUsesModal) failures.push('record detail view is not using the centered modal presentation')
if (!recordModalPolished) failures.push('record modal table/detail rendering is not polished enough')
if (!recordDetailSingleColumn) failures.push('record detail descriptions should use a single-column layout to avoid squeezed values')
if (missingRecordLabels.length) failures.push(`record modal missing Chinese labels for: ${missingRecordLabels.join(', ')}`)
if (!mutationRefreshCoverage) failures.push('mutation success refresh coverage is missing for form or confirm actions')
if (dangerActionIssues.length) failures.push(`danger actions without confirm/form gate: ${dangerActionIssues.join(', ')}`)

if (failures.length) {
  console.error(`BUTTON_REALITY_AUDIT_FAILED\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('BUTTON_REALITY_AUDIT_OK')
