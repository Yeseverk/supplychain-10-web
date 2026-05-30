#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const apiBase = process.env.FLEXCHAIN_API_BASE || 'http://localhost:9200'
const tenantCode = process.env.FLEXCHAIN_TENANT_CODE || 'TC-20260528-7012'
const username = process.env.FLEXCHAIN_TENANT_ADMIN_USER || 'admin@flexchain.local'
const password = process.env.FLEXCHAIN_AUDIT_PASSWORD || 'Admin123456'

const tenantId = process.env.FLEXCHAIN_TENANT_ID || '2059984036520636418'
const orderId = process.env.FLEXCHAIN_CHAIN_ORDER_ID || '930000000000100101'
const orderNo = process.env.FLEXCHAIN_CHAIN_ORDER_NO || 'SO-CODEX-CHAIN-101'
const warehouseId = process.env.FLEXCHAIN_CHAIN_WAREHOUSE_ID || '910000000000000501'
const skuId = process.env.FLEXCHAIN_CHAIN_SKU_ID || '910000000000000401'
const skuCode = process.env.FLEXCHAIN_CHAIN_SKU_CODE || 'SKU-US-AX901'
const skuName = process.env.FLEXCHAIN_CHAIN_SKU_NAME || 'AX9 Pet Dryer White 110V'

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

async function mysqlConnection() {
  return {
    execute: (sql) => mysqlExecute(sql),
    end: async () => undefined,
  }
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

async function prepareOrder(connection) {
  await connection.execute(`DELETE FROM order_address WHERE order_id = ${orderId}`)
  await connection.execute(`DELETE FROM order_item WHERE order_id = ${orderId}`)
  await connection.execute(`DELETE FROM order_log WHERE order_id = ${orderId}`)
  await connection.execute(`DELETE FROM outbound_order_item WHERE outbound_id IN (SELECT id FROM outbound_order WHERE ref_no = ${sqlString(orderNo)})`)
  await connection.execute(`DELETE FROM outbound_order WHERE ref_no = ${sqlString(orderNo)}`)
  await connection.execute(`DELETE FROM logistics_fee_record WHERE waybill_no IN (SELECT waybill_no FROM logistics_waybill WHERE order_id = ${orderId})`)
  await connection.execute(`DELETE FROM logistics_track WHERE waybill_id IN (SELECT id FROM logistics_waybill WHERE order_id = ${orderId})`)
  await connection.execute(`DELETE FROM logistics_waybill WHERE order_id = ${orderId}`)
  await connection.execute(`DELETE FROM order_main WHERE id = ${orderId}`)

  await connection.execute(
    `INSERT INTO order_main
    (id, tenant_id, order_no, platform, platform_order_no, store_id, total_amount, discount_amount, shipping_fee,
     payment_amount, currency, exchange_rate, cny_amount, platform_fee, status, is_abnormal, warehouse_id,
     delivery_deadline, platform_order_time, platform_pay_time, create_by, update_by, is_deleted, version)
     VALUES (${orderId}, ${tenantId}, ${sqlString(orderNo)}, 'TikTok', ${sqlString(`TT-${orderNo}`)}, 1001,
     199.99, 0.00, 0.00, 199.99, 'USD', 7.200000, 1439.93, 0.00, 0, 0, ${warehouseId},
     CURDATE() + INTERVAL 2 DAY, NOW(), NOW(), 2059984037695041538, 2059984037695041538, 0, 0)`,
  )
  await connection.execute(
    `INSERT INTO order_item
    (id, tenant_id, order_id, order_no, sku_id, sku_code, sku_name, platform_sku_id, quantity, unit_price,
     discount, amount, currency, refunded_qty)
     VALUES (${nextId(orderId, 1)}, ${tenantId}, ${orderId}, ${sqlString(orderNo)}, ${skuId}, ${sqlString(skuCode)}, ${sqlString(skuName)}, 'CHAIN-SKU', 1, 199.9900, 0.00, 199.99, 'USD', 0)`,
  )
  await connection.execute(
    `INSERT INTO order_address
    (id, tenant_id, order_id, receiver_name, phone, email, country_code, country_name, state, city,
     address_line1, address_line2, zip_code, full_address, is_verified)
     VALUES (${nextId(orderId, 2)}, ${tenantId}, ${orderId}, 'Codex Chain Buyer', '+1 213 555 0101', 'buyer@example.com', 'US', 'United States',
     'CA', 'Los Angeles', '900 Flower Street', NULL, '90015', '900 Flower Street Los Angeles US', 1)`,
  )
}

async function one(connection, sql) {
  const rows = await connection.execute(sql)
  return rows[0]
}

async function main() {
  const user = await login()
  const authHeaders = {
    [user.tokenName || 'Authorization']: user.tokenValue,
    'X-Tenant-Code': user.tenantCode || tenantCode,
  }

  const connection = await mysqlConnection()
  try {
    await prepareOrder(connection)
    const beforeInventory = await one(connection, `SELECT quantity FROM inventory WHERE warehouse_id=${warehouseId} AND sku_id=${skuId} LIMIT 1`)

    const approve = await request(`/api/oms/orders/${orderId}/approve`, { method: 'PUT', headers: authHeaders })
    assertOk('approve order', approve)

    const outboundRow = await one(connection, `SELECT id, outbound_no, status, total_qty FROM outbound_order WHERE ref_no=${sqlString(orderNo)} LIMIT 1`)
    const outbound = outboundRow
      ? { id: outboundRow[0], outbound_no: outboundRow[1], status: outboundRow[2], total_qty: outboundRow[3] }
      : null
    if (!outbound) throw new Error('approve order did not create WMS outbound_order')

    const confirm = await request(`/api/wms/outbound/${outbound.id}/confirm`, { method: 'PUT', headers: authHeaders })
    assertOk('confirm outbound', confirm)

    const shippedOrderRow = await one(connection, `SELECT status, waybill_no, ship_time FROM order_main WHERE id=${orderId}`)
    const shippedOrder = { status: shippedOrderRow[0], waybill_no: shippedOrderRow[1], ship_time: shippedOrderRow[2] }
    if (Number(shippedOrder.status) !== 5) throw new Error(`OMS was not updated to SHIPPED after WMS confirm, status=${shippedOrder.status}`)
    if (shippedOrder.waybill_no) throw new Error(`WMS outbound polluted OMS waybill_no: ${shippedOrder.waybill_no}`)

    const afterInventory = await one(connection, `SELECT quantity FROM inventory WHERE warehouse_id=${warehouseId} AND sku_id=${skuId} LIMIT 1`)
    if (Number(afterInventory[0]) !== Number(beforeInventory[0]) - 1) {
      throw new Error(`inventory was not deducted by 1, before=${beforeInventory[0]}, after=${afterInventory[0]}`)
    }

    const waybillPayload = {
      orderId,
      orderNo,
      warehouseId,
      receiverName: 'Codex Chain Buyer',
      receiverPhone: '+1 213 555 0101',
      countryCode: 'US',
      state: 'CA',
      city: 'Los Angeles',
      addressLine1: '900 Flower Street',
      zipCode: '90015',
      actualWeightG: 9600,
      lengthMm: 620,
      widthMm: 520,
      heightMm: 540,
      declaredValue: 199.99,
      declaredCurrency: 'USD',
      declaredNameEn: 'Pet Dryer Box',
      hsCode: '85167990',
      isGift: 0,
    }
    const waybill = await request('/api/tms/waybills', { method: 'POST', headers: authHeaders, body: JSON.stringify(waybillPayload) })
    assertOk('create waybill', waybill)

    const finalOrderRow = await one(connection, `SELECT status, waybill_no FROM order_main WHERE id=${orderId}`)
    const finalOrder = { status: finalOrderRow[0], waybill_no: finalOrderRow[1] }
    if (!finalOrder.waybill_no) throw new Error('TMS waybill did not write tracking/waybill number back to OMS')

    console.log(
      JSON.stringify(
        {
          apiBase,
          tenantCode,
          orderId,
          orderNo,
          outbound,
          beforeInventory: Number(beforeInventory[0]),
          afterInventory: Number(afterInventory[0]),
          waybillId: waybill.body.data,
          finalOrder,
          status: 'OMS_WMS_TMS_CHAIN_OK',
        },
        null,
        2,
      ),
    )
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
