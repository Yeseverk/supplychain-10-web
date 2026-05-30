#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const apiBase = process.env.FLEXCHAIN_API_BASE || 'http://localhost:9200'
const tenantCode = process.env.FLEXCHAIN_TENANT_CODE || 'TC-20260528-7012'
const username = process.env.FLEXCHAIN_TENANT_ADMIN_USER || 'admin@flexchain.local'
const password = process.env.FLEXCHAIN_AUDIT_PASSWORD || 'Admin123456'

const tenantId = process.env.FLEXCHAIN_TENANT_ID || '2059984036520636418'
const adminUserId = process.env.FLEXCHAIN_ADMIN_USER_ID || '2059984037695041538'
const creatorUserId = process.env.FLEXCHAIN_CHAIN_CREATOR_USER_ID || '920000000000000402'

const supplierId = process.env.FLEXCHAIN_CHAIN_SUPPLIER_ID || '930000000000200101'
const supplierCode = process.env.FLEXCHAIN_CHAIN_SUPPLIER_CODE || 'SUP-CODEX-CHAIN-101'
const supplierName = process.env.FLEXCHAIN_CHAIN_SUPPLIER_NAME || 'Codex Chain Supplier 101'
const supplierEmail = process.env.FLEXCHAIN_CHAIN_SUPPLIER_EMAIL || 'codex-chain-supplier-101@example.com'
const reqTitle = process.env.FLEXCHAIN_CHAIN_REQ_TITLE || 'Codex SRM PMS WMS FMS Chain 101'

const warehouseId = process.env.FLEXCHAIN_CHAIN_WAREHOUSE_ID || '910000000000000501'
const warehouseName = process.env.FLEXCHAIN_CHAIN_WAREHOUSE_NAME || '洛杉矶海外仓'
const locationId = process.env.FLEXCHAIN_CHAIN_LOCATION_ID || '910000000000000511'
const skuId = process.env.FLEXCHAIN_CHAIN_SKU_ID || '910000000000000403'
const skuCode = process.env.FLEXCHAIN_CHAIN_SKU_CODE || 'SKU-PKG-110'
const skuName = process.env.FLEXCHAIN_CHAIN_SKU_NAME || '抗压快递纸箱 40x30x28cm'
const quantity = Number(process.env.FLEXCHAIN_CHAIN_PURCHASE_QTY || '3')
const unitPrice = Number(process.env.FLEXCHAIN_CHAIN_UNIT_PRICE || '12.50')
const payableAmount = (quantity * unitPrice).toFixed(2)

const mysqlConfig = {
  cli: process.env.MYSQL_CLI || 'D:\\mysql-8.0.26-winx64\\mysql-8.0.26-winx64\\bin\\mysql.exe',
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || '123456',
  database: process.env.MYSQL_DATABASE || 'supplychain_dev',
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

function assertOk(name, result) {
  const code = result.body?.code
  if (result.status < 200 || result.status >= 300 || (code !== undefined && code !== 0 && code !== 200)) {
    throw new Error(`${name} failed: HTTP ${result.status}, code ${code ?? '-'}, body=${JSON.stringify(result.body)}`)
  }
}

async function login() {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ tenantCode, username, password }),
  })
  assertOk('login', result)
  return result.body.data
}

async function mysqlExecute(sql) {
  const { stdout } = await execFileAsync(mysqlConfig.cli, [
    `-h${mysqlConfig.host}`,
    `-P${mysqlConfig.port}`,
    `-u${mysqlConfig.user}`,
    `-p${mysqlConfig.password}`,
    '--default-character-set=utf8mb4',
    '--batch',
    '--raw',
    '--skip-column-names',
    mysqlConfig.database,
    '-e',
    sql,
  ])
  return parseMysqlRows(stdout)
}

function parseMysqlRows(stdout) {
  const text = stdout.trim()
  if (!text) return []
  return text.split(/\r?\n/).map((line) => line.split('\t').map((value) => (value === 'NULL' ? null : value)))
}

function sqlString(value) {
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function nextId(id, increment) {
  return (BigInt(id) + BigInt(increment)).toString()
}

async function one(sql) {
  const rows = await mysqlExecute(sql)
  return rows[0]
}

async function prepareSupplier() {
  await mysqlExecute(`
    DELETE FROM finance_payment_record WHERE payable_id IN (
      SELECT id FROM finance_payable WHERE po_id IN (SELECT id FROM purchase_order WHERE supplier_id = ${supplierId})
    );
    DELETE FROM finance_payable WHERE po_id IN (SELECT id FROM purchase_order WHERE supplier_id = ${supplierId});
    DELETE FROM purchase_receipt_item WHERE receipt_id IN (
      SELECT id FROM purchase_receipt WHERE po_id IN (SELECT id FROM purchase_order WHERE supplier_id = ${supplierId})
    );
    DELETE FROM purchase_receipt WHERE po_id IN (SELECT id FROM purchase_order WHERE supplier_id = ${supplierId});
    DELETE FROM purchase_order_item WHERE po_id IN (SELECT id FROM purchase_order WHERE supplier_id = ${supplierId});
    DELETE FROM purchase_order WHERE supplier_id = ${supplierId};
    DELETE FROM purchase_requisition_item WHERE req_id IN (SELECT id FROM purchase_requisition WHERE title = ${sqlString(reqTitle)});
    DELETE FROM purchase_requisition WHERE title = ${sqlString(reqTitle)};
    DELETE FROM supplier_cert WHERE supplier_id = ${supplierId};
    DELETE FROM supplier_audit_log WHERE supplier_id = ${supplierId};
    DELETE FROM sys_user WHERE username = ${sqlString(supplierEmail)};
    DELETE FROM supplier WHERE id = ${supplierId};
  `)
  await mysqlExecute(`
    INSERT INTO supplier (
      id, tenant_id, supplier_code, supplier_name, supplier_type, category_ids, province, city, address,
      contact_name, contact_phone, contact_email, bank_name, bank_account, bank_account_name,
      tax_no, invoice_type, moq, lead_time_days, monthly_capacity, currency, payment_days,
      grade, score, status, portal_enabled, remark, tags, create_by, update_by, is_deleted, version
    ) VALUES (
      ${supplierId}, ${tenantId}, ${sqlString(supplierCode)}, ${sqlString(supplierName)}, 1, JSON_ARRAY(1), 'CA', 'Los Angeles',
      '900 Flower Street', 'Codex Supplier Contact', '13800001001', ${sqlString(supplierEmail)},
      'FlexChain Bank', '6222000000000101', ${sqlString(supplierName)}, 'TAX-CODEX-101', 1,
      1, 7, 1000, 'CNY', 15, 'C', 0.00, 1, 0, 'chain audit supplier', JSON_ARRAY('chain-audit'),
      ${creatorUserId}, ${creatorUserId}, 0, 0
    );
    INSERT INTO supplier_cert (
      id, tenant_id, supplier_id, cert_type, cert_name, file_name, file_url, file_size, file_type,
      issue_date, expire_date, is_expired, cert_no, remark, create_by, is_deleted
    ) VALUES (
      ${nextId(supplierId, 1)}, ${tenantId}, ${supplierId}, 1, '营业执照', 'license.pdf',
      'https://example.com/license.pdf', 1024, 'application/pdf', CURDATE(), CURDATE() + INTERVAL 365 DAY,
      0, 'LIC-CODEX-101', 'chain audit cert', ${creatorUserId}, 0
    );
  `)
}

async function main() {
  const user = await login()
  const authHeaders = {
    [user.tokenName || 'Authorization']: user.tokenValue,
    'X-Tenant-Code': user.tenantCode || tenantCode,
  }

  await prepareSupplier()

  const supplierApprove = await request(`/api/srm/suppliers/${supplierId}/approve`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ auditRemark: '链路审计：供应商审核通过' }),
  })
  assertOk('approve supplier', supplierApprove)
  const supplierRow = await one(`SELECT status, portal_enabled FROM supplier WHERE id = ${supplierId}`)
  if (!supplierRow || Number(supplierRow[0]) !== 2 || Number(supplierRow[1]) !== 1) {
    throw new Error(`supplier was not approved, row=${JSON.stringify(supplierRow)}`)
  }

  const beforeInventoryRow = await one(`SELECT quantity FROM inventory WHERE warehouse_id=${warehouseId} AND sku_id=${skuId} AND location_id=${locationId} LIMIT 1`)
  const beforeInventory = beforeInventoryRow ? Number(beforeInventoryRow[0]) : 0

  const requisitionPayload = {
    title: reqTitle,
    warehouseId,
    expectDate: '2026-06-05',
    totalAmount: payableAmount,
    priority: 2,
    applyUserId: adminUserId,
    applyUserName: '租户管理员',
    remark: 'SRM-PMS-WMS-FMS chain audit',
    items: [{
      skuId,
      skuCode,
      skuName,
      unit: '件',
      quantity,
      unitPrice,
      expectDate: '2026-06-05',
    }],
  }
  const requisition = await request('/api/pms/requisitions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(requisitionPayload),
  })
  assertOk('create requisition', requisition)
  const reqId = String(requisition.body.data)
  const submit = await request(`/api/pms/requisitions/${reqId}/submit`, { method: 'PUT', headers: authHeaders })
  assertOk('submit requisition', submit)
  const reqRow = await one(`SELECT status FROM purchase_requisition WHERE id=${reqId}`)
  if (!reqRow || ![1, 2].includes(Number(reqRow[0]))) {
    throw new Error(`requisition status was not submitted/approved, status=${reqRow?.[0]}`)
  }
  if (Number(reqRow[0]) === 1) {
    const approveReq = await request(`/api/pms/requisitions/${reqId}/approve`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ auditUserId: adminUserId, auditRemark: '链路审计：采购申请审批通过' }),
    })
    assertOk('approve requisition', approveReq)
  }

  const orderPayload = {
    reqId,
    supplierId,
    supplierName,
    warehouseId,
    warehouseName,
    totalAmount: payableAmount,
    taxAmount: 0,
    currency: 'CNY',
    exchangeRate: 1,
    paymentType: 1,
    paymentDays: 15,
    orderDate: '2026-05-30',
    expectedDate: '2026-06-05',
    confirmedDate: '2026-06-05',
    invoiceNo: 'INV-CODEX-CHAIN-101',
    remark: 'SRM-PMS-WMS-FMS chain audit',
    items: [{
      skuId,
      skuCode,
      skuName,
      unit: '件',
      quantity,
      unitPrice,
      expectDate: '2026-06-05',
    }],
  }
  const order = await request('/api/pms/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orderPayload),
  })
  assertOk('create purchase order', order)
  const poId = String(order.body.data)
  for (const [name, path] of [
    ['send purchase order', `/api/pms/orders/${poId}/send`],
    ['confirm purchase order', `/api/pms/orders/${poId}/confirm`],
    ['mark purchase order shipping', `/api/pms/orders/${poId}/shipping`],
  ]) {
    const result = await request(path, { method: 'PUT', headers: authHeaders })
    assertOk(name, result)
  }

  const detail = await request(`/api/pms/orders/${poId}/detail`, { headers: authHeaders })
  assertOk('purchase order detail', detail)
  const poItemId = String(detail.body.data.items[0].id)

  const receiptPayload = {
    poId,
    receiveDate: '2026-05-30',
    receiverId: adminUserId,
    receiverName: '租户管理员',
    remark: 'SRM-PMS-WMS-FMS chain audit receipt',
    items: [{
      poItemId,
      expectedQty: quantity,
      actualQty: quantity,
      passQty: quantity,
      rejectQty: 0,
      locationId,
    }],
  }
  const receipt = await request('/api/pms/receipts', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(receiptPayload),
  })
  assertOk('create receipt', receipt)
  const receiptId = String(receipt.body.data)
  const confirmReceipt = await request(`/api/pms/receipts/${receiptId}/confirm`, { method: 'PUT', headers: authHeaders })
  assertOk('confirm receipt inbound', confirmReceipt)

  const receiptRow = await one(`SELECT receipt_no, status FROM purchase_receipt WHERE id=${receiptId}`)
  if (!receiptRow || Number(receiptRow[1]) !== 3) {
    throw new Error(`receipt was not confirmed, row=${JSON.stringify(receiptRow)}`)
  }
  const receiptNo = receiptRow[0]
  const afterInventoryRow = await one(`SELECT quantity FROM inventory WHERE warehouse_id=${warehouseId} AND sku_id=${skuId} AND location_id=${locationId} LIMIT 1`)
  const afterInventory = afterInventoryRow ? Number(afterInventoryRow[0]) : 0
  if (afterInventory !== beforeInventory + quantity) {
    throw new Error(`inventory was not increased by ${quantity}, before=${beforeInventory}, after=${afterInventory}`)
  }
  const inventoryLogRow = await one(`SELECT change_qty, before_qty, after_qty FROM inventory_log WHERE ref_no=${sqlString(receiptNo)} AND sku_id=${skuId} LIMIT 1`)
  if (!inventoryLogRow || Number(inventoryLogRow[0]) !== quantity) {
    throw new Error(`inventory log missing for receipt ${receiptNo}, row=${JSON.stringify(inventoryLogRow)}`)
  }

  const payableRow = await one(`SELECT id, payable_no, payable_amount, paid_amount, status FROM finance_payable WHERE po_id=${poId} LIMIT 1`)
  if (!payableRow) {
    throw new Error('finance payable was not generated after full receipt')
  }
  const payableId = String(payableRow[0])
  if (Number(payableRow[2]) !== Number(payableAmount) || Number(payableRow[4]) !== 0) {
    throw new Error(`unexpected payable state, row=${JSON.stringify(payableRow)}`)
  }

  const payment = await request(`/api/fms/payables/${payableId}/pay`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      paymentAmount: payableAmount,
      paymentDate: '2026-05-30',
      paymentMethod: 1,
      voucherNo: 'PAY-CODEX-CHAIN-101',
      operatorId: adminUserId,
      operatorName: '租户管理员',
      remark: 'SRM-PMS-WMS-FMS chain audit payment',
    }),
  })
  assertOk('pay payable', payment)

  const finalPayableRow = await one(`SELECT paid_amount, status FROM finance_payable WHERE id=${payableId}`)
  if (!finalPayableRow || Number(finalPayableRow[0]) !== Number(payableAmount) || Number(finalPayableRow[1]) !== 3) {
    throw new Error(`payable was not settled, row=${JSON.stringify(finalPayableRow)}`)
  }
  const paymentRow = await one(`SELECT payment_amount, voucher_no FROM finance_payment_record WHERE payable_id=${payableId} LIMIT 1`)
  if (!paymentRow || Number(paymentRow[0]) !== Number(payableAmount)) {
    throw new Error(`payment record missing, row=${JSON.stringify(paymentRow)}`)
  }
  const finalPoRow = await one(`SELECT status FROM purchase_order WHERE id=${poId}`)
  if (!finalPoRow || Number(finalPoRow[0]) !== 7) {
    throw new Error(`purchase order was not settled after payment, status=${finalPoRow?.[0]}`)
  }

  console.log(JSON.stringify({
    apiBase,
    tenantCode,
    supplierId,
    reqId,
    poId,
    receiptId,
    payableId,
    beforeInventory,
    afterInventory,
    payableNo: payableRow[1],
    status: 'SRM_PMS_WMS_FMS_CHAIN_OK',
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
