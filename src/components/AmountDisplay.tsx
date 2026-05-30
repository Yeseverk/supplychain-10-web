import { formatAmount } from '../utils/format'

type Props = {
  value: number
  currency?: string
}

export function AmountDisplay({ value, currency = 'CNY' }: Props) {
  return <span className="amount-display">{formatAmount(value, currency)}</span>
}
