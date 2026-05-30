import { categories, pageOf, skus, spus } from '../data/mock'
import type { PageParams, PageResult, ProductCategory, ProductSku, ProductSpu } from '../types'
import { adaptPage, idOf, number, statusFromMap, statusLabel, statusParam, text } from './helpers'
import { request, shouldUseMock } from './request'

type Row = Record<string, unknown>

const productStatus: Record<number, string> = { 0: '草稿', 1: '待审核', 2: '已上架', 3: '已下架' }
const productStatusValue = Object.fromEntries(Object.entries(productStatus).map(([key, value]) => [value, Number(key)]))
const skuStatus: Record<number, string> = { 0: '草稿', 1: '正常' }
const skuStatusValue = Object.fromEntries(Object.entries(skuStatus).map(([key, value]) => [value, Number(key)]))
const categoryPathText: Record<string, string> = {
  '/pet': '宠物电器',
  '/outdoor': '户外用品',
  '/packaging': '包装耗材',
}

function specText(raw: unknown) {
  if (!raw) return '-'
  const value = text(raw, '')
  try {
    const parsed = JSON.parse(value) as Record<string, string>
    return Object.entries(parsed)
      .map(([key, val]) => `${key}:${val}`)
      .join(' / ')
  } catch {
    return value || '-'
  }
}

function adaptSpu(row: Row): ProductSpu {
  return {
    id: idOf(row),
    spuCode: text(row.spuCode, `SPU-${idOf(row)}`),
    spuName: text(row.spuName || row.name, '未命名商品'),
    categoryId: text(row.categoryId, ''),
    categoryName: text(row.categoryName || categoryPathText[text(row.categoryPath, '')] || row.categoryPath, '-'),
    categoryPath: text(row.categoryPath, ''),
    brand: text(row.brand, ''),
    originCountry: text(row.originCountry, ''),
    material: text(row.material, ''),
    spuDesc: text(row.spuDesc, ''),
    packageDesc: text(row.packageDesc, ''),
    status: statusFromMap(row.status, productStatus, '草稿'),
    skuCount: number(row.skuCount),
    createdAt: text(row.createTime || row.createdAt, '-'),
  }
}

function adaptSku(row: Row): ProductSku {
  return {
    id: idOf(row),
    skuCode: text(row.skuCode, `SKU-${idOf(row)}`),
    skuName: text(row.skuName || row.name, '未命名 SKU'),
    spuName: text(row.spuName, '-'),
    spec: specText(row.spec || row.specValues),
    status: statusFromMap(row.status, skuStatus, '正常'),
    salePrice: number(row.salePrice || row.price || row.costPrice),
    currency: text(row.currency || row.costCurrency, 'USD'),
  }
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  try {
    return await request<ProductCategory[]>({ url: '/api/pim/categories/tree' })
  } catch (error) {
    if (shouldUseMock(error)) return categories
    throw error
  }
}

export async function fetchSpus(params: PageParams): Promise<PageResult<ProductSpu>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, productStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    return adaptPage(await request<PageResult<Row>>({ url: '/api/pim/spus', params: query }), adaptSpu, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) {
      const keyword = String(params.keyword || '').trim()
      const status = statusLabel(params.status, productStatus)
      return pageOf(
        spus.filter((item) => (!keyword || item.spuCode.includes(keyword) || item.spuName.includes(keyword) || item.categoryName.includes(keyword)) && (!status || item.status === status)),
        params.pageNum,
        params.pageSize,
      )
    }
    throw error
  }
}

export async function fetchSpuDetail(id: string | number): Promise<ProductSpu> {
  try {
    return adaptSpu(await request<Row>({ url: `/api/pim/spus/${id}` }))
  } catch (error) {
    if (shouldUseMock(error)) return spus.find((item) => String(item.id) === String(id)) || spus[0]
    throw error
  }
}

export async function createSpu(data: Record<string, unknown>) {
  try {
    return await request<string | number>({ url: '/api/pim/spus', method: 'post', data })
  } catch (error) {
    if (shouldUseMock(error)) return Date.now()
    throw error
  }
}

export async function updateSpu(id: string | number, data: Record<string, unknown>) {
  try {
    return await request<void>({ url: `/api/pim/spus/${id}`, method: 'put', data })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function batchCreateSkus(spuId: string | number, skus: Array<Record<string, unknown>>) {
  try {
    return await request<number>({ url: `/api/pim/spus/${spuId}/skus/batch`, method: 'post', data: { skus } })
  } catch (error) {
    if (shouldUseMock(error)) return skus.length
    throw error
  }
}

export async function publishSpu(id: string | number, onSale = true) {
  try {
    return await request<void>({ url: `/api/pim/spus/${id}/${onSale ? 'on-sale' : 'off-sale'}`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchSkus(params: PageParams & { spuId?: string | number }): Promise<PageResult<ProductSku>> {
  try {
    const query: Record<string, unknown> = { pageNum: params.pageNum, pageSize: params.pageSize }
    const keyword = String(params.keyword || '').trim()
    const status = statusParam(params.status, skuStatusValue)
    if (keyword) query.keyword = keyword
    if (status !== undefined) query.status = status
    if (params.spuId) query.spuId = params.spuId
    return adaptPage(await request<PageResult<Row>>({ url: '/api/pim/skus', params: query }), adaptSku, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(skus, params.pageNum, params.pageSize)
    throw error
  }
}

export async function fetchSkuDetail(id: string | number): Promise<ProductSku> {
  try {
    return adaptSku(await request<Row>({ url: `/api/pim/skus/${id}` }))
  } catch (error) {
    if (shouldUseMock(error)) return skus.find((item) => String(item.id) === String(id)) || skus[0]
    throw error
  }
}

export async function updateSkuPrice(id: string | number, price: number, currency = 'USD') {
  try {
    return await request<void>({
      url: `/api/pim/skus/${id}/prices`,
      method: 'put',
      data: {
        prices: [
          {
            priceType: 1,
            price,
            currency,
            minQty: 1,
          },
        ],
      },
    })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}
