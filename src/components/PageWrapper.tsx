import { Breadcrumb, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  breadcrumbs?: string[]
  extra?: ReactNode
  children: ReactNode
}

export function PageWrapper({ title, description, breadcrumbs = [], extra, children }: Props) {
  return (
    <Space orientation="vertical" size={14} className="full-width page-wrapper">
      <div className="page-heading">
        <div>
          {breadcrumbs.length ? <Breadcrumb className="page-breadcrumb" items={breadcrumbs.map((item) => ({ title: item }))} /> : null}
          <Typography.Title level={2}>{title}</Typography.Title>
          {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
        </div>
        {extra ? <div className="page-actions">{extra}</div> : null}
      </div>
      {children}
    </Space>
  )
}
