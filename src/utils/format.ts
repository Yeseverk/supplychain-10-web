export function formatAmount(value = 0, currency = 'CNY') {
  const symbolMap: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£' }
  const symbol = symbolMap[currency] || `${currency} `
  const abs = Math.abs(value)
  if (abs >= 100000000) return `${symbol}${(value / 100000000).toFixed(1)}亿`
  if (abs >= 10000) return `${symbol}${(value / 10000).toFixed(1)}万`
  return `${symbol}${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(value = 0) {
  return value.toLocaleString('zh-CN')
}

export function maskPhone(value?: string) {
  if (!value) return '-'
  return value.replace(/^(\d{3})\d{4}(\d+)/, '$1****$2')
}

export function warningText(status: string) {
  const map: Record<string, string> = {
    normal: '正常',
    tight: '紧张',
    low: '不足',
    zero: '零库存',
  }
  return map[status] || status
}

export function sourceLabel(source?: 'real' | 'mock') {
  return source === 'mock' ? '演示数据' : '真实接口'
}
