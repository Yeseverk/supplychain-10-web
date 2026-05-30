import { Tag } from 'antd'

const statusColor: Record<string, string> = {
  草稿: 'default',
  待处理: 'default',
  待审核: 'orange',
  待确认: 'orange',
  待供应商确认: 'orange',
  待入库: 'orange',
  进行中: 'blue',
  入库中: 'blue',
  发货中: 'blue',
  运输中: 'blue',
  盘点中: 'blue',
  部分到货: 'blue',
  已确认: 'green',
  已完成: 'green',
  全部到货: 'green',
  已对账: 'green',
  已结清: 'green',
  正常: 'green',
  已通过: 'green',
  已拒绝: 'red',
  已取消: 'red',
  异常: 'red',
  已停用: 'default',
  紧张: 'gold',
  不足: 'red',
  零库存: 'red',
  逾期: 'red',
}

type Props = {
  value?: string | number
}

export function StatusTag({ value }: Props) {
  const text = value == null || value === '' ? '-' : String(value)
  return <Tag color={statusColor[text] || 'blue'}>{text}</Tag>
}
