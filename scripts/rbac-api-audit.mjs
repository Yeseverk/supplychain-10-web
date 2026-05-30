#!/usr/bin/env node

const apiBase = process.env.FLEXCHAIN_API_BASE || 'http://localhost:9200'
const tenantCode = process.env.FLEXCHAIN_TENANT_CODE || 'TC-20260528-7012'
const password = process.env.FLEXCHAIN_AUDIT_PASSWORD || 'Admin123456'

const accounts = [
  {
    key: 'tenant-admin',
    label: 'seller tenant admin',
    username: process.env.FLEXCHAIN_TENANT_ADMIN_USER || 'admin@flexchain.local',
    password,
    expectedRoles: ['ROLE_TENANT_ADMIN'],
    expectedRealName: '租户管理员',
  },
  {
    key: 'warehouse-specialist',
    label: 'seller warehouse specialist',
    username: process.env.FLEXCHAIN_WAREHOUSE_USER || 'warehouse@flexchain.local',
    password,
    expectedRoles: ['ROLE_WAREHOUSE_SPECIALIST'],
    allowedRoutes: ['/dashboard', '/wms/warehouse', '/wms/inventory', '/wms/inbound', '/wms/outbound', '/wms/stocktake'],
    forbiddenPermissionPrefixes: ['srm:', 'pim:', 'pms:', 'oms:', 'tms:', 'fms:', 'bi:', 'system:', 'sys:'],
  },
]

const platformRoleCodes = new Set(['ROLE_SUPER_ADMIN', 'ROLE_PLATFORM_ADMIN', 'ROLE_PLATFORM_OPS'])

const permissionAliases = {
  'pim:spu:list': ['pim:product:manage'],
  'pim:sku:list': ['pim:product:manage'],
  'pms:req:list': ['pms:order:list', 'pms:order:manage'],
  'pms:inquiry:list': ['pms:order:list', 'pms:order:manage'],
  'wms:warehouse:list': ['wms:warehouse:manage'],
  'wms:inbound:list': ['wms:inbound:manage'],
  'wms:outbound:list': ['wms:outbound:manage'],
  'wms:stocktake:list': ['wms:stocktake:audit'],
  'oms:refund:list': ['oms:order:manage'],
  'tms:waybill:list': ['tms:waybill:add', 'tms:logistics:manage'],
  'tms:channel:list': ['tms:logistics:manage'],
  'tms:recommend:use': ['tms:logistics:manage'],
  'fms:payable:list': ['fms:bill:import', 'fms:profit:view'],
  'fms:bill:list': ['fms:bill:import'],
  'fms:cashflow:view': ['fms:profit:view'],
  'bi:kpi:view': ['bi:dashboard:view'],
  'bi:reorder:view': ['bi:dashboard:view'],
  'bi:ai:use': ['bi:dashboard:view'],
  'system:user:list': ['sys:user:list'],
  'system:role:list': ['sys:role:manage'],
  'system:message:manage': ['sys:message:manage'],
}

const routes = [
  { route: '/dashboard', permission: undefined, apis: ['/api/auth/profile', '/api/auth/permissions'] },
  { route: '/srm/supplier', permission: 'srm:supplier:list', apis: ['/api/srm/suppliers?pageNum=1&pageSize=5'] },
  { route: '/pim/spu', permission: 'pim:spu:list', apis: ['/api/pim/spus?pageNum=1&pageSize=5'] },
  { route: '/pim/sku', permission: 'pim:sku:list', apis: ['/api/pim/skus?pageNum=1&pageSize=5'] },
  { route: '/pms/requisition', permission: 'pms:req:list', apis: ['/api/pms/requisitions/page?pageNum=1&pageSize=5'] },
  { route: '/pms/inquiry', permission: 'pms:inquiry:list', apis: ['/api/pms/inquiries/page?pageNum=1&pageSize=5'] },
  { route: '/pms/order', permission: 'pms:order:list', apis: ['/api/pms/orders/page?pageNum=1&pageSize=5'] },
  { route: '/pms/payable', permission: 'fms:payable:list', apis: ['/api/fms/payables?pageNum=1&pageSize=5'] },
  { route: '/wms/warehouse', permission: 'wms:warehouse:list', apis: ['/api/wms/warehouses?pageNum=1&pageSize=5'] },
  { route: '/wms/inventory', permission: 'wms:inventory:list', apis: ['/api/wms/inventory?pageNum=1&pageSize=5'] },
  { route: '/wms/inbound', permission: 'wms:inbound:list', apis: ['/api/wms/inbound?pageNum=1&pageSize=5'] },
  { route: '/wms/outbound', permission: 'wms:outbound:list', apis: ['/api/wms/outbound?pageNum=1&pageSize=5'] },
  { route: '/wms/stocktake', permission: 'wms:stocktake:list', apis: ['/api/wms/stocktake?pageNum=1&pageSize=5'] },
  { route: '/oms/order', permission: 'oms:order:list', apis: ['/api/oms/orders?pageNum=1&pageSize=5'] },
  { route: '/oms/refund', permission: 'oms:refund:list', apis: ['/api/oms/refunds?pageNum=1&pageSize=5'] },
  { route: '/tms/waybill', permission: 'tms:waybill:list', apis: ['/api/tms/waybills?pageNum=1&pageSize=5'] },
  { route: '/tms/channel', permission: 'tms:channel:list', apis: ['/api/tms/channels?pageNum=1&pageSize=5'] },
  { route: '/tms/recommend', permission: 'tms:recommend:use', apis: ['/api/tms/channels?pageNum=1&pageSize=5'] },
  { route: '/fms/payable', permission: 'fms:payable:list', apis: ['/api/fms/payables?pageNum=1&pageSize=5'] },
  { route: '/fms/bill', permission: 'fms:bill:list', apis: ['/api/fms/bills?pageNum=1&pageSize=5'] },
  { route: '/fms/profit', permission: 'fms:profit:view', apis: ['/api/fms/profit/sku?pageNum=1&pageSize=5'] },
  { route: '/fms/cashflow', permission: 'fms:cashflow:view', apis: ['/api/fms/cash-flow?pageNum=1&pageSize=5'] },
  { route: '/bi/kpi', permission: 'bi:kpi:view', apis: ['/api/bi/kpi/dashboard?pageNum=1&pageSize=5'] },
  { route: '/bi/reorder', permission: 'bi:reorder:view', apis: ['/api/bi/reorder/suggestions?pageNum=1&pageSize=5'] },
  { route: '/system/user', permission: 'system:user:list', apis: ['/api/system/users/page?pageNum=1&pageSize=5'] },
  {
    route: '/system/role',
    permission: 'system:role:list',
    apis: ['/api/system/roles/page?pageNum=1&pageSize=20', '/api/system/menus/page?pageNum=1&pageSize=200'],
  },
  { route: '/system/message', permission: 'system:message:manage', apis: ['/api/messages/page?pageNum=1&pageSize=5', '/api/messages/unread-count'] },
]

function hasPermission(user, permission) {
  if (!permission) return true
  const permissions = user.permissions || []
  if (permissions.includes('*') || permissions.includes(permission)) return true
  return (permissionAliases[permission] || []).some((alias) => permissions.includes(alias))
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: response.status, body }
}

async function login(account) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ tenantCode, username: account.username, password: account.password }),
  })
  if (result.status !== 200 || result.body?.code !== 200 || !result.body?.data?.tokenValue) {
    throw new Error(`${account.username} login failed: HTTP ${result.status} ${JSON.stringify(result.body)}`)
  }
  return result.body.data
}

async function probeApi(user, api) {
  const result = await request(api, {
    headers: {
      [user.tokenName || 'Authorization']: user.tokenValue,
      'X-Tenant-Code': user.tenantCode || tenantCode,
    },
  })
  const businessCode = typeof result.body === 'object' && result.body ? result.body.code : undefined
  const message = typeof result.body === 'object' && result.body ? result.body.msg || result.body.message : undefined
  const ok = result.status >= 200 && result.status < 300 && (businessCode === undefined || businessCode === 0 || businessCode === 200)
  return {
    api,
    ok,
    httpStatus: result.status,
    businessCode,
    message,
    body: result.body,
  }
}

function roleExplanation(user) {
  const roles = user.roles || []
  if (roles.includes('ROLE_TENANT_ADMIN')) {
    return 'Seller workspace tenant admin: manages users, roles, and tenant-scoped business settings.'
  }
  return 'Seller workspace business role: sees routes and actions granted to the role only.'
}

function assertSellerIdentity(account, user) {
  const roles = user.roles || []
  const issues = []
  const platformRoles = roles.filter((role) => platformRoleCodes.has(role))
  if (platformRoles.length > 0) {
    issues.push(`seller account must not carry platform roles: ${platformRoles.join(',')}`)
  }
  for (const expectedRole of account.expectedRoles || []) {
    if (!roles.includes(expectedRole)) issues.push(`expected role missing: ${expectedRole}`)
  }
  if (account.expectedRealName && user.realName !== account.expectedRealName) {
    issues.push(`expected realName "${account.expectedRealName}", got "${user.realName || '-'}"`)
  }
  if ((user.permissions || []).includes('*')) {
    issues.push('seller workspace account must not receive wildcard permission "*"')
  }
  return issues
}

function assertBusinessRoleScope(account, user, visibleRoutes) {
  const issues = []
  if (account.allowedRoutes) {
    const allowedRoutes = new Set(account.allowedRoutes)
    const unexpectedRoutes = visibleRoutes.map((route) => route.route).filter((route) => !allowedRoutes.has(route))
    if (unexpectedRoutes.length > 0) {
      issues.push(`business role exposed unexpected routes: ${unexpectedRoutes.join(',')}`)
    }
  }
  if (account.forbiddenPermissionPrefixes) {
    const forbiddenPermissions = (user.permissions || []).filter((permission) =>
      account.forbiddenPermissionPrefixes.some((prefix) => permission.startsWith(prefix)),
    )
    if (forbiddenPermissions.length > 0) {
      issues.push(`business role received forbidden permissions: ${forbiddenPermissions.sort().join(',')}`)
    }
  }
  return issues
}

function assertRolePageDoesNotExposePlatformRoles(check) {
  if (!check.api.startsWith('/api/system/roles/page') || !check.ok) return []
  const records = check.body?.data?.records || check.body?.data?.list || []
  const exposed = records
    .map((row) => row.roleCode || row.code)
    .filter((roleCode) => platformRoleCodes.has(String(roleCode)))
  return exposed.length > 0 ? [`role page exposed platform roles: ${exposed.join(',')}`] : []
}

async function main() {
  const startedAt = new Date()
  const reports = []

  for (const account of accounts) {
    const user = await login(account)
    const visibleRoutes = routes.filter((route) => hasPermission(user, route.permission))
    const hiddenRoutes = routes.filter((route) => !hasPermission(user, route.permission))
    const checks = []

    for (const route of visibleRoutes) {
      for (const api of route.apis) {
        const check = { route: route.route, ...(await probeApi(user, api)) }
        checks.push(check)
      }
    }

    const policyIssues = [
      ...assertSellerIdentity(account, user),
      ...assertBusinessRoleScope(account, user, visibleRoutes),
      ...checks.flatMap(assertRolePageDoesNotExposePlatformRoles),
    ]

    reports.push({
      account: account.key,
      label: account.label,
      username: user.username,
      realName: user.realName,
      tenantCode: user.tenantCode,
      roles: user.roles || [],
      permissionCount: (user.permissions || []).length,
      hasWildcard: (user.permissions || []).includes('*'),
      roleExplanation: roleExplanation(user),
      visibleRouteCount: visibleRoutes.length,
      hiddenRouteCount: hiddenRoutes.length,
      visibleRoutes: visibleRoutes.map((route) => route.route),
      hiddenRoutes: hiddenRoutes.map((route) => route.route),
      checks: checks.map(({ body, ...check }) => check),
      failures: checks.filter((check) => !check.ok).map(({ body, ...check }) => check),
      policyIssues,
    })
  }

  const failedApis = reports.flatMap((report) => report.failures.map((failure) => ({ account: report.account, ...failure })))
  const policyIssues = reports.flatMap((report) => report.policyIssues.map((issue) => ({ account: report.account, issue })))
  const output = {
    apiBase,
    tenantCode,
    auditScope: 'seller-workspace-rbac',
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    failedApiCount: failedApis.length,
    policyIssueCount: policyIssues.length,
    reports,
  }

  console.log(JSON.stringify(output, null, 2))

  if (failedApis.length > 0 || policyIssues.length > 0) {
    console.error('\nSeller RBAC audit failed:')
    for (const failure of failedApis) {
      console.error(`- [${failure.account}] ${failure.route} ${failure.api}: HTTP ${failure.httpStatus}, code ${failure.businessCode ?? '-'}, ${failure.message ?? ''}`)
    }
    for (const issue of policyIssues) {
      console.error(`- [${issue.account}] ${issue.issue}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
