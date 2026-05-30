import { BankOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, App as AntApp, Button, Card, Checkbox, Form, Input, Space, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { loginApi } from '../api/auth'
import { useAuthStore } from '../store/auth'

type LoginFields = {
  tenantCode: string
  username: string
  password: string
  remember: boolean
}

export function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser)
  const navigate = useNavigate()
  const { message: messageApi } = AntApp.useApp()
  const isDev = import.meta.env.DEV

  const mutation = useMutation({
    mutationFn: ({ tenantCode, username, password, remember }: LoginFields) => loginApi({ tenantCode, username, password, remember }),
    onSuccess: (user) => {
      setUser(user)
      messageApi.success('登录成功，欢迎回到 FlexChain')
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '登录失败，请检查账号或后端服务'),
  })

  return (
    <main className="login-shell">
      <section className="login-visual">
        <div className="brand-mark">FC</div>
        <Typography.Title level={1}>FlexChain 卖家工作台</Typography.Title>
        <Typography.Paragraph>
          面向跨境卖家的柔性供应链 SaaS，覆盖供应商、采购、仓储、订单、物流、财务和经营分析。
        </Typography.Paragraph>
        <div className="login-flow">
          <span>动态菜单</span>
          <span>按钮权限</span>
          <span>套餐控制</span>
          <span>业务闭环</span>
        </div>
      </section>

      <Card className="login-card" variant="borderless">
        <Space orientation="vertical" size={20} className="full-width">
          <div className="login-card-title">
            <div className="login-icon">
              <SafetyCertificateOutlined />
            </div>
            <Typography.Title level={3} style={{ margin: 0 }}>企业账号登录</Typography.Title>
            <Typography.Text type="secondary" style={{ marginTop: 4 }}>通过企业租户账号进入供应链协同工作台。</Typography.Text>
          </div>

          {isDev ? <Alert type="info" showIcon title="开发环境已预填演示账号，用于本地联调与页面验收。" /> : null}

          <Form
            layout="vertical"
            initialValues={{
              tenantCode: isDev ? 'TC-20260528-7012' : '',
              username: isDev ? 'admin@flexchain.local' : '',
              password: isDev ? 'Admin123456' : '',
              remember: true,
            }}
            onFinish={(values) => mutation.mutate(values)}
          >
            <Form.Item name="tenantCode" label="租户编码" rules={[{ required: true, message: '请输入租户编码' }]}>
              <Input size="large" prefix={<BankOutlined />} placeholder="如 TC-20260528-7012" />
            </Form.Item>
            <Form.Item name="username" label="企业账号" rules={[{ required: true, message: '请输入企业账号' }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="邮箱或账号" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="登录密码" />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>记住我，7 天免登录</Checkbox>
            </Form.Item>
            <Button block type="primary" size="large" htmlType="submit" loading={mutation.isPending}>
              进入卖家工作台
            </Button>
          </Form>
        </Space>
      </Card>
    </main>
  )
}
