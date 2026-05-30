import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, App as AntApp, Button, Card, Col, Descriptions, Empty, Progress, Row, Space, Table, Timeline, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPurchaseOrderDetail, urgePurchaseOrder } from '../../api/pms'
import { AmountDisplay } from '../../components/AmountDisplay'
import { PageWrapper } from '../../components/PageWrapper'
import { PermissionButton } from '../../components/PermissionButton'
import { StatusTag } from '../../components/StatusTag'
import { showConfirm } from '../../utils/feedback'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const orderId = id || ''
  const navigate = useNavigate()
  const { message: messageApi } = AntApp.useApp()
  const { data, isFetching, refetch } = useQuery({ queryKey: ['pms', 'order', orderId], queryFn: () => fetchPurchaseOrderDetail(orderId), enabled: Boolean(orderId) })

  const sendMutation = useMutation({
    mutationFn: () => urgePurchaseOrder(orderId),
    onSuccess: async () => {
      messageApi.success(`已向 ${data?.supplierName || '供应商'} 发送采购单`)
      await refetch()
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '发送失败，请稍后重试'),
  })
  const confirmSendOrder = () => {
    showConfirm({
      title: `发送采购单 ${data?.orderNo || orderId}？`,
      content: '发送后供应商将进入确认或发货流程。',
      okText: '发送',
      cancelText: '取消',
      onOk: () => sendMutation.mutateAsync(),
    })
  }

  return (
    <PageWrapper
      title={data?.orderNo || '采购单详情'}
      description="查看采购单基础信息、SKU 明细、收货记录、应付账款和状态时间轴。"
      breadcrumbs={['卖家工作台', '采购管理', '采购单详情']}
      extra={
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pms/order')}>
            返回列表
          </Button>
          <PermissionButton type="primary" icon={<SendOutlined />} permission="pms:order:manage" disabled={!orderId} loading={sendMutation.isPending} onClick={confirmSendOrder}>
            发送供应商
          </PermissionButton>
          <PermissionButton permission="pms:receipt:confirm" planFeature="wms.inventory" onClick={() => navigate('/wms/inbound')}>
            确认入库
          </PermissionButton>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="panel-card" variant="borderless" loading={isFetching} title="基础信息">
            <Descriptions bordered column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="供应商">{data?.supplierName || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{data ? <StatusTag value={data.status} /> : '-'}</Descriptions.Item>
              <Descriptions.Item label="目标仓库">{data?.warehouse || '-'}</Descriptions.Item>
              <Descriptions.Item label="期望到货">{data?.expectedArrivalDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="采购总额">{data ? <AmountDisplay value={data.totalAmount} currency={data.currency} /> : '-'}</Descriptions.Item>
              <Descriptions.Item label="折合人民币">{data ? <AmountDisplay value={data.rmbAmount} /> : '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="panel-card" variant="borderless" title="SKU 明细">
            {data?.items.length ? (
              <Table
                rowKey="skuCode"
                pagination={false}
                dataSource={data.items}
                columns={[
                  { title: 'SKU', dataIndex: 'skuCode', width: 150 },
                  { title: '名称', dataIndex: 'name' },
                  { title: '规格', dataIndex: 'spec' },
                  { title: '采购数量', dataIndex: 'quantity', align: 'right' },
                  {
                    title: '到货进度',
                    render: (_, row) => <Progress percent={row.quantity ? Math.round((row.receivedQuantity / row.quantity) * 100) : 0} />,
                  },
                  { title: '单价', dataIndex: 'unitPrice', align: 'right', render: (value) => <AmountDisplay value={value} currency={data.currency} /> },
                ]}
              />
            ) : (
              <Empty description="后端当前未返回该采购单的 SKU 明细" />
            )}
          </Card>

          <Card className="panel-card" variant="borderless" title="收货记录">
            {data?.receipts.length ? (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={data.receipts}
                columns={[
                  { title: '收货单号', dataIndex: 'receiptNo' },
                  { title: '收货时间', dataIndex: 'receivedAt' },
                  { title: '操作人', dataIndex: 'operator' },
                  { title: '数量', dataIndex: 'quantity', align: 'right' },
                ]}
              />
            ) : (
              <Empty description="暂无收货记录" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="panel-card" variant="borderless" title="应付账款">
            <Typography.Title level={3}>{data ? <AmountDisplay value={data.payable.amount} currency={data.currency} /> : '-'}</Typography.Title>
            {!data?.payable || data.payable.status === '待对账' ? <Alert type="info" showIcon title="完成入库后，财务模块会自动生成或更新对应应付账款。" style={{ marginBottom: 16 }} /> : null}
            <Descriptions column={1}>
              <Descriptions.Item label="到期日">{data?.payable.dueDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{data?.payable.status || '-'}</Descriptions.Item>
            </Descriptions>
            <PermissionButton type="primary" block permission="fms:payable:list" planFeature="fms.payable" onClick={() => navigate('/fms/payable')}>
              查看应付明细
            </PermissionButton>
          </Card>

          <Card className="panel-card" variant="borderless" title="状态时间轴">
            <Timeline items={data?.timeline.map((item) => ({ content: `${item.time} · ${item.title} · ${item.operator}` })) || []} />
          </Card>
        </Col>
      </Row>
    </PageWrapper>
  )
}
