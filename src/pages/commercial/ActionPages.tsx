import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Tree, Typography } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useMemo, useState } from 'react'
import { recommendLogisticsChannel } from '../../api/tms'
import {
  fetchMessages,
  fetchSystemMenus,
  fetchSystemRoleMenuIds,
  fetchSystemRoles,
  fetchSystemUserRoleIds,
  fetchSystemUsers,
  markAllMessagesRead,
  markMessageRead,
  saveSystemRoleMenus,
  saveSystemUserRoles,
  unlockSystemUser,
  updateSystemUserStatus,
  type SystemMenu,
  type SystemRole,
  type SystemUser,
} from '../../api/system'
import { PageWrapper } from '../../components/PageWrapper'
import { StatusTag } from '../../components/StatusTag'
import { logisticsChannels } from '../../data/mock'
import { routeMeta } from '../../routes'
import type { PageParams } from '../../types'
import { formatAmount } from '../../utils/format'
import { showConfirm } from '../../utils/feedback'

export function TmsRecommendPage() {
  const meta = routeMeta['/tms/recommend']
  const recommendMutation = useMutation({ mutationFn: recommendLogisticsChannel })
  const fallbackRecommendations = logisticsChannels.map((item, index) => ({
    ...item,
    rank: index + 1,
    fee: index === 0 ? 8.6 : 10.2,
    days: index === 0 ? '5-8 天' : '7-12 天',
    score: index === 0 ? 92 : 84,
    reason: index === 0 ? '价格与时效均衡，适合当前目的国和重量段。' : '覆盖国家广，旺季稳定性较好。',
    currency: 'USD',
  }))
  const recommendations =
    recommendMutation.data?.recommendations.map((item, index) => ({
      id: item.channelId,
      channelName: item.channelName,
      carrierName: item.channelCode,
      rank: index + 1,
      fee: item.estimatedFee,
      days: `${item.minDays}-${item.maxDays} 天`,
      score: item.totalScore,
      reason: item.tips,
      currency: item.currency,
    })) || fallbackRecommendations

  return (
    <PageWrapper title={meta.title} description="输入目的国、重量和申报价，快速选择合适的物流渠道。" breadcrumbs={meta.breadcrumbs}>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="panel-card" variant="borderless" title="包裹参数">
            <Form
              layout="vertical"
              onFinish={(values) =>
                recommendMutation.mutate({
                  countryCode: values.country,
                  actualWeightG: values.weight,
                  declaredValue: values.declaredValue,
                  declaredCurrency: 'USD',
                })
              }
            >
              <Form.Item label="目的国" name="country" initialValue="US" rules={[{ required: true }]}>
                <Select options={['US', 'DE', 'FR', 'GB', 'CA'].map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="实际重量（g）" name="weight" initialValue={680} rules={[{ required: true }]}>
                <InputNumber className="full-width" min={1} />
              </Form.Item>
              <Form.Item label="申报价值（USD）" name="declaredValue" initialValue={49.9} rules={[{ required: true }]}>
                <InputNumber className="full-width" min={1} />
              </Form.Item>
              <Button type="primary" block icon={<ThunderboltOutlined />} htmlType="submit" loading={recommendMutation.isPending}>
                一键推荐
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card className="panel-card" variant="borderless" title="TOP 推荐渠道">
            <Row gutter={[12, 12]}>
              {recommendations.map((item) => (
                <Col xs={24} md={12} key={item.id}>
                  <div className="recommend-card">
                    <Space align="start" className="full-width" orientation="vertical">
                      <Tag color={item.rank === 1 ? 'green' : 'blue'}>TOP {item.rank}</Tag>
                      <Typography.Title level={4}>{item.channelName}</Typography.Title>
                      <Typography.Text type="secondary">{item.reason}</Typography.Text>
                      <Space wrap>
                        <Tag>{item.carrierName}</Tag>
                        <Tag>{formatAmount(item.fee, item.currency || 'USD')}</Tag>
                        <Tag>{item.days}</Tag>
                        <Tag color="purple">评分 {item.score}</Tag>
                      </Space>
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </PageWrapper>
  )
}

export function SystemUserPage() {
  const meta = routeMeta['/system/user']
  const { message: messageApi } = AntApp.useApp()
  const [filterForm] = Form.useForm()
  const [roleForm] = Form.useForm()
  const [params, setParams] = useState<PageParams>({ pageNum: 1, pageSize: 20 })
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const { data, isFetching, refetch } = useQuery({ queryKey: ['system', 'users', params], queryFn: () => fetchSystemUsers(params) })
  const { data: rolePage } = useQuery({ queryKey: ['system', 'roles', 'enabled'], queryFn: () => fetchSystemRoles({ pageNum: 1, pageSize: 100, status: 1 }) })
  const roleOptions = (rolePage?.records || []).map((item) => ({ label: `${item.roleName} (${item.roleCode})`, value: item.id }))
  const unlockMutation = useMutation({
    mutationFn: unlockSystemUser,
    onSuccess: () => {
      messageApi.success('用户已解锁')
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '用户解锁失败'),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: number }) => updateSystemUserStatus(id, status),
    onSuccess: (_, variables) => {
      messageApi.success(variables.status === 1 ? '用户已启用' : '用户已停用')
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '用户状态更新失败'),
  })
  const loadUserRolesMutation = useMutation({
    mutationFn: fetchSystemUserRoleIds,
    onSuccess: (roleIds) => roleForm.setFieldsValue({ roleIds }),
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '用户角色加载失败'),
  })
  const saveUserRolesMutation = useMutation({
    mutationFn: async () => {
      const values = await roleForm.validateFields()
      return saveSystemUserRoles(editingUser?.id || '', values.roleIds || [])
    },
    onSuccess: () => {
      messageApi.success('用户角色已保存')
      setEditingUser(null)
      roleForm.resetFields()
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '用户角色保存失败'),
  })
  const statusText = (value: unknown) => {
    const status = Number(value)
    if (status === 1) return '正常'
    if (status === 2) return '锁定'
    return '停用'
  }
  const search = (values: Record<string, unknown>) => {
    setParams((prev) => ({ ...prev, ...values, pageNum: 1 }))
  }
  const reset = () => {
    filterForm.resetFields()
    setParams({ pageNum: 1, pageSize: 20 })
  }
  const openRoleDrawer = (user: SystemUser) => {
    setEditingUser(user)
    roleForm.resetFields()
    loadUserRolesMutation.mutate(user.id)
  }
  const confirmUserStatus = (user: SystemUser, nextStatus: number) => {
    showConfirm({
      title: nextStatus === 1 ? `启用用户 ${user.realName || user.username}？` : `停用用户 ${user.realName || user.username}？`,
      content: nextStatus === 1 ? '启用后该员工可重新登录并按角色权限访问工作台。' : '停用后该员工将不能继续登录卖家工作台。',
      okText: nextStatus === 1 ? '启用' : '停用',
      cancelText: '取消',
      okButtonProps: { danger: nextStatus !== 1 },
      onOk: () => statusMutation.mutateAsync({ id: user.id, status: nextStatus }),
    })
  }
  const confirmUnlockUser = (user: SystemUser) => {
    showConfirm({
      title: `解锁用户 ${user.realName || user.username}？`,
      content: '解锁后用户可重新尝试登录，请确认已完成身份核验或风险排查。',
      okText: '解锁',
      cancelText: '取消',
      onOk: () => unlockMutation.mutateAsync(user.id),
    })
  }

  return (
    <PageWrapper title={meta.title} description="管理租户内员工账号、角色分配、启停用和密码重置。" breadcrumbs={meta.breadcrumbs} extra={<Button onClick={() => refetch()} loading={isFetching}>刷新</Button>}>
      <Card className="panel-card filter-card" variant="borderless">
        <Form form={filterForm} layout="inline" className="filter-bar" onFinish={search}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="账号 / 姓名 / 邮箱 / 手机" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              className="min-select"
              options={[
                { label: '正常', value: 1 },
                { label: '锁定', value: 2 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={reset}>重置</Button>
          </Form.Item>
        </Form>
      </Card>
      <Card className="panel-card table-card" variant="borderless">
        <Table
          rowKey="id"
          loading={isFetching}
          dataSource={data?.records}
          pagination={{
            current: data?.pageNum || data?.current || 1,
            pageSize: data?.pageSize || data?.size || params.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            onChange: (pageNum, pageSize) => setParams((prev) => ({ ...prev, pageNum, pageSize })),
          }}
          columns={[
            { title: '账号', dataIndex: 'username' },
            { title: '姓名', dataIndex: 'realName' },
            { title: '邮箱', dataIndex: 'email' },
            { title: '手机', dataIndex: 'phone' },
            { title: '状态', dataIndex: 'status', render: (value) => <StatusTag value={statusText(value)} /> },
            { title: '最后登录', dataIndex: 'lastLoginTime' },
            {
              title: '操作',
              width: 180,
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => openRoleDrawer(row)}>
                    角色
                  </Button>
                  {Number(row.status) === 1 ? (
                    <Button type="link" danger loading={statusMutation.isPending} onClick={() => confirmUserStatus(row, 0)}>
                      停用
                    </Button>
                  ) : Number(row.status) === 0 ? (
                    <Button type="link" loading={statusMutation.isPending} onClick={() => confirmUserStatus(row, 1)}>
                      启用
                    </Button>
                  ) : null}
                  {Number(row.status) === 2 ? (
                    <Button type="link" loading={unlockMutation.isPending} onClick={() => confirmUnlockUser(row)}>
                      解锁
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Drawer
        title={editingUser ? `${editingUser.realName || editingUser.username} 角色分配` : '角色分配'}
        size={520}
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setEditingUser(null)}>取消</Button>
            <Button type="primary" loading={saveUserRolesMutation.isPending} onClick={() => saveUserRolesMutation.mutate()} disabled={!editingUser}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" loading={loadUserRolesMutation.isPending} options={roleOptions} placeholder="请选择角色" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageWrapper>
  )
}

export function SystemRolePage() {
  const meta = routeMeta['/system/role']
  const { message: messageApi } = AntApp.useApp()
  const [filterForm] = Form.useForm()
  const [params, setParams] = useState<PageParams>({ pageNum: 1, pageSize: 20 })
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null)
  const [checkedMenuIds, setCheckedMenuIds] = useState<string[]>([])
  const { data: rolePage, isFetching: rolesLoading, refetch } = useQuery({ queryKey: ['system', 'roles', params], queryFn: () => fetchSystemRoles(params) })
  const { data: menuPage } = useQuery({ queryKey: ['system', 'menus'], queryFn: () => fetchSystemMenus({ pageNum: 1, pageSize: 200 }) })
  const roles = useMemo(() => rolePage?.records || [], [rolePage?.records])
  const menus = useMemo(() => menuPage?.records || [], [menuPage?.records])
  const menuTreeData = useMemo(() => buildMenuTree(menus), [menus])
  const menuCount = menus.length
  const roleIdsKey = useMemo(() => roles.map((role) => role.id).join(','), [roles])
  const { data: rolePermissionCounts = {} } = useQuery({
    queryKey: ['system', 'role-permission-counts', roleIdsKey],
    enabled: roles.length > 0,
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(roles.map((role) => fetchSystemRoleMenuIds(role.id).then((ids) => [role.id, ids.length] as const).catch(() => [role.id, 0] as const))),
      ),
  })
  const loadRoleMenusMutation = useMutation({
    mutationFn: fetchSystemRoleMenuIds,
    onSuccess: (ids) => setCheckedMenuIds(ids),
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '角色权限加载失败'),
  })
  const saveRoleMenusMutation = useMutation({
    mutationFn: () => saveSystemRoleMenus(editingRole?.id || '', checkedMenuIds),
    onSuccess: () => {
      messageApi.success('角色权限已保存')
      setEditingRole(null)
      setCheckedMenuIds([])
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '角色权限保存失败'),
  })
  const openPermissionDrawer = (role: SystemRole) => {
    setEditingRole(role)
    setCheckedMenuIds([])
    loadRoleMenusMutation.mutate(role.id)
  }
  const search = (values: Record<string, unknown>) => {
    setParams((prev) => ({ ...prev, ...values, pageNum: 1 }))
  }
  const reset = () => {
    filterForm.resetFields()
    setParams({ pageNum: 1, pageSize: 20 })
  }

  return (
    <PageWrapper title={meta.title} description="按模块、资源、操作三级权限配置角色能力。" breadcrumbs={meta.breadcrumbs} extra={<Button loading={rolesLoading} onClick={() => refetch()}>刷新</Button>}>
      <Card className="panel-card filter-card" variant="borderless">
        <Form form={filterForm} layout="inline" className="filter-bar" onFinish={search}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="角色名称 / 编码 / 备注" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              className="min-select"
              options={[
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={reset}>重置</Button>
          </Form.Item>
        </Form>
      </Card>
      <Card className="panel-card table-card" variant="borderless">
        <Table<SystemRole>
          rowKey="id"
          loading={rolesLoading}
          dataSource={roles}
          pagination={{
            current: rolePage?.pageNum || rolePage?.current || 1,
            pageSize: rolePage?.pageSize || rolePage?.size || params.pageSize,
            total: rolePage?.total || 0,
            showSizeChanger: true,
            onChange: (pageNum, pageSize) => setParams((prev) => ({ ...prev, pageNum, pageSize })),
          }}
          columns={[
            { title: '角色名称', dataIndex: 'roleName' },
            { title: '角色编码', dataIndex: 'roleCode' },
            { title: '状态', dataIndex: 'status', width: 110, render: (value) => <StatusTag value={Number(value) === 1 ? '启用' : '停用'} /> },
            { title: '排序', dataIndex: 'sortOrder', width: 90 },
            {
              title: '已分配 / 总权限',
              width: 150,
              render: (_, row) => (
                <Tag color="blue">
                  {rolePermissionCounts[row.id] ?? '-'} / {menuCount}
                </Tag>
              ),
            },
            {
              title: '操作',
              width: 120,
              render: (_, row) => (
                <Button type="link" onClick={() => openPermissionDrawer(row)}>
                  权限
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Drawer
        title={editingRole ? `${editingRole.roleName} 权限配置` : '权限配置'}
        size={520}
        open={Boolean(editingRole)}
        onClose={() => setEditingRole(null)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setEditingRole(null)}>取消</Button>
            <Button type="primary" loading={saveRoleMenusMutation.isPending} onClick={() => saveRoleMenusMutation.mutate()} disabled={!editingRole}>
              保存
            </Button>
          </Space>
        }
      >
        <SpinTree loading={loadRoleMenusMutation.isPending} treeData={menuTreeData} checkedKeys={checkedMenuIds} onCheck={setCheckedMenuIds} />
      </Drawer>
    </PageWrapper>
  )
}

function buildMenuTree(menus: SystemMenu[]): DataNode[] {
  const childrenByParent = menus.reduce<Record<string, SystemMenu[]>>((acc, item) => {
    const parentId = item.parentId && item.parentId !== item.id ? item.parentId : '0'
    acc[parentId] = acc[parentId] || []
    acc[parentId].push(item)
    return acc
  }, {})
  const toNode = (item: SystemMenu): DataNode => {
    const children = (childrenByParent[item.id] || []).sort((a, b) => a.sortOrder - b.sortOrder).map(toNode)
    return {
      title: item.permissionCode ? `${item.menuName}（${item.permissionCode}）` : item.menuName,
      key: item.id,
      children: children.length ? children : undefined,
    }
  }
  return (childrenByParent['0'] || []).sort((a, b) => a.sortOrder - b.sortOrder).map(toNode)
}

function SpinTree({
  loading,
  treeData,
  checkedKeys,
  onCheck,
}: {
  loading: boolean
  treeData: ReturnType<typeof buildMenuTree>
  checkedKeys: string[]
  onCheck: (keys: string[]) => void
}) {
  if (loading) return <Typography.Text type="secondary">权限加载中...</Typography.Text>
  if (!treeData.length) return <Typography.Text type="secondary">暂无可分配菜单权限</Typography.Text>
  return (
    <Tree
      checkable
      defaultExpandAll
      treeData={treeData}
      checkedKeys={checkedKeys}
      onCheck={(keys) => onCheck((Array.isArray(keys) ? keys : keys.checked).map(String))}
    />
  )
}

export function MessageCenterPage() {
  const meta = routeMeta['/system/message']
  const { message: messageApi } = AntApp.useApp()
  const [filterForm] = Form.useForm()
  const [params, setParams] = useState<PageParams>({ pageNum: 1, pageSize: 20 })
  const { data, isFetching, isError, refetch } = useQuery({ queryKey: ['system', 'messages', params], queryFn: () => fetchMessages(params) })
  const markReadMutation = useMutation({
    mutationFn: markMessageRead,
    onSuccess: () => {
      messageApi.success('消息已标记为已读')
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '消息已读操作失败'),
  })
  const markAllReadMutation = useMutation({
    mutationFn: markAllMessagesRead,
    onSuccess: () => {
      messageApi.success('全部消息已标记为已读')
      void refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '全部已读操作失败'),
  })
  const search = (values: Record<string, unknown>) => {
    setParams((prev) => ({ ...prev, ...values, pageNum: 1 }))
  }
  const reset = () => {
    filterForm.resetFields()
    setParams({ pageNum: 1, pageSize: 20 })
  }
  const confirmMarkAllRead = () => {
    showConfirm({
      title: '全部消息标记为已读？',
      content: '确认后当前用户的未读消息会统一标记为已读。',
      okText: '全部已读',
      cancelText: '取消',
      onOk: () => markAllReadMutation.mutateAsync(),
    })
  }

  return (
    <PageWrapper
      title={meta.title}
      description="集中查看业务通知、系统公告、库存告警和财务提醒。"
      breadcrumbs={meta.breadcrumbs}
      extra={
        <Space>
          <Button loading={markAllReadMutation.isPending} disabled={isFetching || !data?.records?.some((item) => Number(item.readStatus) === 0)} onClick={confirmMarkAllRead}>
            全部已读
          </Button>
          <Button loading={isFetching} onClick={() => refetch()}>刷新</Button>
        </Space>
      }
    >
      {isError ? <Alert className="compact-alert" showIcon type="error" title="消息接口请求失败，请检查后端服务后刷新。" /> : null}
      <Card className="panel-card filter-card" variant="borderless">
        <Form form={filterForm} layout="inline" className="filter-bar" onFinish={search}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="标题 / 内容 / 类型" />
          </Form.Item>
          <Form.Item name="readStatus" label="状态">
            <Select
              allowClear
              className="min-select"
              options={[
                { label: '未读', value: 0 },
                { label: '已读', value: 1 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={reset}>重置</Button>
          </Form.Item>
        </Form>
      </Card>
      <Card className="panel-card table-card" variant="borderless">
        <Table
          rowKey="id"
          loading={isFetching}
          dataSource={data?.records || []}
          locale={{ emptyText: isError ? '消息接口请求失败，暂无可展示数据' : '暂无消息' }}
          pagination={{
            current: data?.pageNum || data?.current || 1,
            pageSize: data?.pageSize || data?.size || params.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            onChange: (pageNum, pageSize) => setParams((prev) => ({ ...prev, pageNum, pageSize })),
          }}
          columns={[
            { title: '标题', dataIndex: 'title', width: 220 },
            { title: '内容', dataIndex: 'content' },
            { title: '类型', dataIndex: 'type', width: 120, render: (value) => <Tag>{String(value)}</Tag> },
            { title: '状态', dataIndex: 'readStatus', width: 100, render: (value) => <StatusTag value={Number(value) === 0 ? '待处理' : '已完成'} /> },
            { title: '时间', dataIndex: 'createdAt', width: 160 },
            {
              title: '操作',
              width: 110,
              render: (_, row) =>
                Number(row.readStatus) === 0 ? (
                  <Button type="link" loading={markReadMutation.isPending} onClick={() => markReadMutation.mutate(row.id)}>
                    标记已读
                  </Button>
                ) : (
                  <Typography.Text type="secondary">已读</Typography.Text>
                ),
            },
          ]}
        />
      </Card>
    </PageWrapper>
  )
}

export function AiQueryPage() {
  return (
    <PageWrapper title="AI 智能查询" description="沉淀常用经营分析问题，接入模型服务后可直接生成数据洞察。" breadcrumbs={['卖家工作台', '数据分析', 'AI 智能查询']}>
      <Card className="panel-card" variant="borderless">
        <Space orientation="vertical" size={16} className="full-width">
          <RobotOutlined className="large-muted-icon" />
          <Typography.Title level={3}>经营分析模板</Typography.Title>
          <Typography.Text type="secondary">
            选择一个分析主题，系统会保留查询意图并在模型服务可用后生成对应的数据表格和图表建议。
          </Typography.Text>
          <Space wrap>
            {['上月各 SKU 利润分析', '近 30 天缺货预警', '供应商绩效排名', '哪些 SKU 需要立即补货'].map((item) => (
              <Button key={item} disabled>
                {item}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>
    </PageWrapper>
  )
}
