import {
  BellOutlined,
  CheckSquareOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Dropdown, Layout, Menu, Space, Tabs, Tooltip, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchUnreadMessageCount } from '../api/system'
import { logoutApi } from '../api/auth'
import { useAuthStore } from '../store/auth'
import { defaultOpenKeys, menuTree, routeMeta } from '../routes'
import type { RouteMenuItem } from '../types'

const { Header, Sider, Content } = Layout

const getIconWrapper = (icon: React.ReactNode, pathOrKey: string) => {
  if (!icon) return undefined
  const cleanKey = pathOrKey.replace(/^\//, '').split('/')[0] || 'default'
  return <span className={`menu-icon-wrapper menu-icon-${cleanKey}`}>{icon}</span>
}

function toMenuItems(items: RouteMenuItem[], can: (permission?: string) => boolean): MenuProps['items'] {
  return items.flatMap((item) => {
    if (!can(item.permission)) return []
    const children = item.children ? toMenuItems(item.children, can) : undefined
    if (item.children && (!children || children.length === 0)) return []
    return [{
      key: item.path || item.key,
      icon: getIconWrapper(item.icon, item.path || item.key),
      label: item.label,
      children,
    }]
  })
}

function selectedKeyOf(pathname: string) {
  if (pathname.startsWith('/pms/order/')) return '/pms/order'
  return routeMeta[pathname] ? pathname : '/dashboard'
}

export function DefaultLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [tabs, setTabs] = useState<Array<{ key: string; label: string }>>([{ key: '/dashboard', label: routeMeta['/dashboard'].title }])
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const navigate = useNavigate()
  const location = useLocation()
  const canReadMessages = hasPermission('system:message:manage')
  const { data: unread = 0 } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: fetchUnreadMessageCount,
    refetchInterval: 30_000,
    enabled: canReadMessages,
  })

  const menuItems = useMemo(() => toMenuItems(menuTree, hasPermission), [hasPermission])
  const selectedKey = selectedKeyOf(location.pathname)
  const currentTitle = routeMeta[selectedKey]?.title || '工作台'
  const displayedTabs = tabs.some((item) => item.key === selectedKey) ? tabs : [...tabs, { key: selectedKey, label: currentTitle }]

  const openPath = (path: string) => {
    if (!path.startsWith('/')) return
    const title = routeMeta[path]?.title || '工作台'
    setTabs((prev) => (prev.some((item) => item.key === path) ? prev : [...prev, { key: path, label: title }]))
    navigate(path)
  }

  const userMenu: MenuProps = {
    items: [
      ...(canReadMessages ? [{ key: 'message', label: '消息中心' }, { type: 'divider' as const }] : []),
      { key: 'logout', label: '退出登录', danger: true, icon: <LogoutOutlined /> },
    ],
    onClick: async ({ key }) => {
      if (key === 'message') {
        openPath('/system/message')
        return
      }
      if (key === 'logout') {
        await logoutApi(user?.refreshToken)
        logout()
        navigate('/login', { replace: true })
      }
    },
  }

  return (
    <Layout className="app-shell">
      <Sider width={264} collapsed={collapsed} className="app-sider" trigger={null}>
        <div className="sider-brand">
          <div className="brand-mark small">FC</div>
          {!collapsed ? (
            <div>
              <strong>FlexChain</strong>
              <span>卖家工作台</span>
            </div>
          ) : null}
        </div>
        <Menu theme="light" mode="inline" selectedKeys={[selectedKey]} defaultOpenKeys={defaultOpenKeys} items={menuItems} onClick={({ key }) => openPath(String(key))} />
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="header-left">
            <Button className="nav-toggle" type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((value) => !value)} />
            <div className="tenant-heading">
              <Typography.Text className="tenant-title">{user?.tenantCode || 'FlexChain'}</Typography.Text>
              <Typography.Text className="header-subtitle">卖家工作台 · 多租户 · RBAC 权限</Typography.Text>
            </div>
          </div>

          <Space size={10} className="header-actions">
            <Tooltip title="待办事项">
              <Button className="header-icon-button" icon={<CheckSquareOutlined />} onClick={() => openPath('/dashboard')} />
            </Tooltip>
            {canReadMessages ? (
              <Tooltip title="消息中心">
                <Badge count={unread} size="small" overflowCount={99}>
                  <Button className="header-icon-button" icon={<BellOutlined />} onClick={() => openPath('/system/message')} />
                </Badge>
              </Tooltip>
            ) : null}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Space className="user-dropdown">
                <Avatar className="user-avatar">{(user?.realName || '用').slice(0, 1)}</Avatar>
                <div className="user-meta">
                  <strong>{user?.realName || '当前用户'}</strong>
                  <span>{user?.roles?.join(' / ') || '租户成员'}</span>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content className="app-content">
          <Tabs
            className="tags-view"
            activeKey={selectedKey}
            type="editable-card"
            hideAdd
            items={displayedTabs.map((item) => ({ ...item, closable: item.key !== '/dashboard' }))}
            onChange={(key) => openPath(key)}
            onEdit={(targetKey, action) => {
              if (action !== 'remove' || typeof targetKey !== 'string' || targetKey === '/dashboard') return
              setTabs((prev) => prev.filter((item) => item.key !== targetKey))
              if (targetKey === selectedKey) navigate('/dashboard')
            }}
          />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
