import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Select, Space, Spin, Table, Tabs, Timeline, Typography, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { useEffect, useMemo, useState } from 'react'
import { PageWrapper } from '../../components/PageWrapper'
import { PermissionButton } from '../../components/PermissionButton'
import { useTable } from '../../hooks/useTable'
import { setCommercialFeedbackApi, type CommercialPageConfig } from './pageConfigs'

type Props<T extends object> = {
  config: CommercialPageConfig<T>
}

type DrawerPayload = {
  title: string
  data?: unknown
  load?: () => Promise<unknown>
}

type FormField = {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select' | 'file'
  required?: boolean
  options?: Array<{ label: string; value: string | number }>
}

type FormPayload = {
  title: string
  fields: FormField[]
  initialValues?: Record<string, unknown>
  submit: (values: Record<string, unknown>) => Promise<unknown>
  successText?: string
}

const fieldLabels: Record<string, string> = {
  id: 'ID',
  supplierCode: '供应商编码',
  supplierName: '供应商名称',
  supplierType: '供应商类型',
  contactName: '联系人',
  contactPhone: '联系电话',
  province: '省份',
  city: '城市',
  grade: '评级',
  score: '评分',
  status: '状态',
  spuCode: 'SPU 编码',
  spuName: '商品名称',
  skuCode: 'SKU 编码',
  skuName: 'SKU 名称',
  categoryName: '类目',
  warehouseName: '仓库名称',
  warehouseCode: '仓库编码',
  locationCode: '库位编码',
  zone: '库区',
  orderNo: '订单号',
  platformOrderNo: '平台订单号',
  waybillNo: '运单号',
  trackingNo: '物流商单号',
  carrierName: '物流商',
  channelName: '渠道',
  currentTrack: '当前轨迹',
  operatedAt: '操作时间',
  operator: '操作人',
  remark: '备注',
  createdAt: '创建时间',
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function renderDrawerContent(data: unknown) {
  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>
  if (Array.isArray(data)) {
    if (!data.length) return <Typography.Text type="secondary">暂无明细</Typography.Text>
    const keys = Object.keys((data[0] || {}) as Record<string, unknown>).slice(0, 8)
    return (
      <Table
        size="small"
        rowKey={(row, index) => String((row as Record<string, unknown>).id || index)}
        pagination={false}
        dataSource={data as Record<string, unknown>[]}
        columns={keys.map((key) => ({ title: fieldLabels[key] || key, dataIndex: key, ellipsis: true, align: 'center' as const, render: valueText }))}
      />
    )
  }
  const row = data as Record<string, unknown>
  if ('time' in row && 'title' in row && 'operator' in row) {
    return (
      <Timeline
        items={[row].map((item) => ({
          children: `${valueText(item.time)} ${valueText(item.title)} - ${valueText(item.operator)}`,
        }))}
      />
    )
  }
  return (
    <Descriptions column={1} size="small" bordered>
      {Object.entries(row)
        .filter(([, value]) => value !== undefined && typeof value !== 'function')
        .slice(0, 36)
        .map(([key, value]) => (
          <Descriptions.Item key={key} label={fieldLabels[key] || key}>
            {valueText(value)}
          </Descriptions.Item>
        ))}
    </Descriptions>
  )
}

export function CommercialListPage<T extends object>({ config }: Props<T>) {
  const table = useTable()
  const { message: messageApi } = AntApp.useApp()
  const [filterForm] = Form.useForm()
  const [form] = Form.useForm()
  const [drawer, setDrawer] = useState<DrawerPayload | null>(null)
  const [drawerData, setDrawerData] = useState<unknown>()
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [formDrawer, setFormDrawer] = useState<FormPayload | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const { data, isFetching, refetch, isError } = useQuery({
    queryKey: [...config.queryKey, table.params],
    queryFn: () => config.fetcher(table.params),
  })
  const records = data?.records || []
  const centeredColumns = useMemo(
    () => config.columns.map((column) => ({ align: 'center' as const, ...column })) as ColumnsType<T>,
    [config.columns],
  )

  const rowKey = useMemo(() => {
    if (typeof config.rowKey === 'function') return config.rowKey
    const key = config.rowKey
    return (row: T) => String(row[key])
  }, [config.rowKey])

  useEffect(() => {
    setCommercialFeedbackApi(messageApi)
  }, [messageApi])

  useEffect(() => {
    const openFormDrawer = (event: Event) => {
      const payload = (event as CustomEvent<FormPayload>).detail
      setFormDrawer(payload)
      form.setFieldsValue(payload.initialValues || {})
    }
    window.addEventListener('flexchain:form-drawer', openFormDrawer)
    return () => window.removeEventListener('flexchain:form-drawer', openFormDrawer)
  }, [form])

  const submitFormDrawer = async () => {
    if (!formDrawer) return
    const values = await form.validateFields()
    setFormSubmitting(true)
    try {
      await formDrawer.submit(values)
      messageApi.success(formDrawer.successText || '操作成功')
      setFormDrawer(null)
      form.resetFields()
      void refetch()
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '操作失败，请稍后重试')
    } finally {
      setFormSubmitting(false)
    }
  }

  const renderFormField = (field: FormField) => {
    if (field.type === 'number') return <InputNumber className="full-width" />
    if (field.type === 'textarea') return <Input.TextArea rows={3} />
    if (field.type === 'select') return <Select options={field.options} />
    if (field.type === 'file') {
      return (
        <Upload
          maxCount={1}
          beforeUpload={() => false}
          onChange={({ fileList }) => form.setFieldValue(field.name, fileList)}
        >
          <Button>选择文件</Button>
        </Upload>
      )
    }
    return <Input />
  }

  useEffect(() => {
    const refresh = () => void refetch()
    window.addEventListener('flexchain:table-refresh', refresh)
    return () => window.removeEventListener('flexchain:table-refresh', refresh)
  }, [refetch])

  useEffect(() => {
    const openDrawer = (event: Event) => {
      const payload = (event as CustomEvent<DrawerPayload>).detail
      setDrawer(payload)
      setDrawerData(payload.data)
      if (payload.load) {
        setDrawerLoading(true)
        payload
          .load()
          .then(setDrawerData)
          .catch((error) => {
            messageApi.error(error instanceof Error ? error.message : '详情加载失败')
            setDrawerData(payload.data)
          })
          .finally(() => setDrawerLoading(false))
      }
    }
    window.addEventListener('flexchain:record-drawer', openDrawer)
    return () => window.removeEventListener('flexchain:record-drawer', openDrawer)
  }, [messageApi])

  return (
    <PageWrapper
      title={config.title}
      description={config.description}
      breadcrumbs={config.breadcrumbs}
      extra={
        <Space>
          {config.primaryAction && config.onPrimaryAction ? (
            <PermissionButton type="primary" permission={config.permission} onClick={config.onPrimaryAction}>
              {config.primaryAction}
            </PermissionButton>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>
      }
    >
      {isError && !records.length ? <Alert className="compact-alert" showIcon type="error" title="接口请求失败，请检查后端服务后刷新。" /> : null}

      <Card className="panel-card filter-card" variant="borderless">
        {config.statusTabs?.length ? (
          <Tabs
            activeKey={config.statusTabs.find((t) => t.value === table.params.status)?.label || '全部'}
            items={config.statusTabs.map((item) => ({ key: item.label, label: item.label }))}
            onChange={(label) => {
              const option = config.statusTabs!.find((t) => t.label === label)
              table.search({ status: option?.value })
            }}
          />
        ) : null}
        <Form form={filterForm} layout="inline" className="filter-bar" onFinish={table.search}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="编号 / 名称 / 业务关键词" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              onClick={() => {
                filterForm.resetFields()
                table.reset()
              }}
            >
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="panel-card table-card" variant="borderless">
        <Table<T>
          rowKey={rowKey}
          loading={isFetching}
          dataSource={records}
          columns={centeredColumns}
          scroll={{ x: 1100 }}
          locale={{ emptyText: isError ? '接口请求失败，暂无可展示数据' : '暂无数据' }}
          pagination={{
            current: data?.pageNum || data?.current || 1,
            pageSize: data?.pageSize || data?.size || table.params.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: table.changePage,
          }}
        />
      </Card>
      <Drawer title={drawer?.title} size={560} open={Boolean(drawer)} onClose={() => setDrawer(null)} destroyOnHidden>
        <Spin spinning={drawerLoading}>{renderDrawerContent(drawerData)}</Spin>
      </Drawer>
      <Drawer
        title={formDrawer?.title}
        size={520}
        open={Boolean(formDrawer)}
        onClose={() => setFormDrawer(null)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setFormDrawer(null)}>取消</Button>
            <Button type="primary" loading={formSubmitting} onClick={submitFormDrawer}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          {formDrawer?.fields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              valuePropName={field.type === 'file' ? 'fileList' : undefined}
              getValueFromEvent={field.type === 'file' ? (event: { fileList?: UploadFile[] }) => event?.fileList : undefined}
              rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
            >
              {renderFormField(field)}
            </Form.Item>
          ))}
        </Form>
      </Drawer>
    </PageWrapper>
  )
}
