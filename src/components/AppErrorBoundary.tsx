import { Alert, Button, Space } from 'antd'
import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error?: Error
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          title="页面加载失败"
          description={
            <Space orientation="vertical">
              <span>当前页面组件发生异常，请刷新后重试。</span>
              <Button type="primary" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </Space>
          }
        />
      </div>
    )
  }
}
