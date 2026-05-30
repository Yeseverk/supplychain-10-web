import { Empty, Button } from 'antd'

type Props = {
  title: string
  action?: string
  onAction?: () => void
}

export function EmptyState({ title, action, onAction }: Props) {
  return (
    <Empty className="empty-state" description={title}>
      {action ? (
        <Button type="primary" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </Empty>
  )
}
