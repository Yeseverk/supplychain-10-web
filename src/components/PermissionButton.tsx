import { Button, Tooltip, type ButtonProps } from 'antd'
import { usePermission } from '../hooks/usePermission'
import { useTenantPlan } from '../hooks/useTenantPlan'

type Props = ButtonProps & {
  permission?: string
  planFeature?: string
}

export function PermissionButton({ permission, planFeature, disabled, children, ...props }: Props) {
  const { can } = usePermission()
  const { supported } = useTenantPlan()

  if (!can(permission)) return null

  const planSupported = supported(planFeature)
  const button = (
    <Button {...props} disabled={disabled || !planSupported}>
      {children}
    </Button>
  )

  if (!planSupported) {
    return <Tooltip title="当前套餐不支持，升级即可使用">{button}</Tooltip>
  }

  return button
}
