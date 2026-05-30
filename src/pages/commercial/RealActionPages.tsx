import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { fetchAiTemplates, queryAiAnalysis, type AiQueryResult } from '../../api/bi'
import { recommendLogisticsChannel } from '../../api/tms'
import { PageWrapper } from '../../components/PageWrapper'
import { routeMeta } from '../../routes'
import { formatAmount } from '../../utils/format'

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}


const aiResultFieldLabels: Record<string, string> = {
  skuId: 'SKU ID',
  skuCode: 'SKU编码',
  skuName: 'SKU名称',
  spuName: '商品名称',
  orderNo: '订单号',
  supplierName: '供应商',
  warehouseName: '仓库',
  inventoryQty: '库存数量',
  availableQty: '可用数量',
  lockedQty: '锁定数量',
  salesQty: '销量',
  revenue: '销售额',
  costAmount: '成本金额',
  profit: '利润',
  profitRate: '利润率',
  turnoverDays: '周转天数',
  suggestQty: '建议补货量',
  riskLevel: '风险等级',
  status: '状态',
  createdAt: '创建时间',
  updatedAt: '更新时间',
}

function aiResultLabel(key: string) {
  return aiResultFieldLabels[key] || key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

function aiResultColumnWidth(key: string) {
  if (/id$/i.test(key)) return 130
  if (/qty|quantity|amount|price|profit|revenue|cost|rate/i.test(key)) return 128
  if (/date|time|created|updated/i.test(key)) return 150
  if (/name|title/i.test(key)) return 180
  if (/no|code/i.test(key)) return 160
  return 140
}

export function RealTmsRecommendPage() {
  const meta = routeMeta['/tms/recommend']
  const recommendMutation = useMutation({ mutationFn: recommendLogisticsChannel })
  const recommendations = recommendMutation.data?.recommendations || []

  return (
    <PageWrapper title={meta.title} description="输入目的国、重量和申报信息，调用真实物流推荐接口返回可用渠道。" breadcrumbs={meta.breadcrumbs}>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card className="panel-card" variant="borderless" title="包裹参数">
            <Form
              layout="vertical"
              onFinish={(values) =>
                recommendMutation.mutate({
                  countryCode: String(values.countryCode),
                  actualWeightG: Number(values.actualWeightG),
                  lengthMm: values.lengthMm === undefined ? undefined : Number(values.lengthMm),
                  widthMm: values.widthMm === undefined ? undefined : Number(values.widthMm),
                  heightMm: values.heightMm === undefined ? undefined : Number(values.heightMm),
                  hasBattery: Number(values.hasBattery || 0) === 1,
                  hasLiquid: Number(values.hasLiquid || 0) === 1,
                  hasPowder: Number(values.hasPowder || 0) === 1,
                  declaredValue: values.declaredValue === undefined ? undefined : Number(values.declaredValue),
                  declaredCurrency: values.declaredCurrency ? String(values.declaredCurrency) : 'USD',
                  maxDaysRequired: values.maxDaysRequired === undefined ? undefined : Number(values.maxDaysRequired),
                })
              }
            >
              <Form.Item label="目的国" name="countryCode" initialValue="US" rules={[{ required: true, message: '请选择目的国' }]}>
                <Select options={['US', 'DE', 'FR', 'GB', 'CA'].map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="实际重量(g)" name="actualWeightG" initialValue={680} rules={[{ required: true, message: '请输入实际重量' }]}>
                <InputNumber className="full-width" min={1} />
              </Form.Item>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item label="长(mm)" name="lengthMm">
                    <InputNumber className="full-width" min={1} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="宽(mm)" name="widthMm">
                    <InputNumber className="full-width" min={1} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="高(mm)" name="heightMm">
                    <InputNumber className="full-width" min={1} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="申报价值" name="declaredValue" initialValue={49.9}>
                <InputNumber className="full-width" min={0} />
              </Form.Item>
              <Form.Item label="申报币种" name="declaredCurrency" initialValue="USD">
                <Select options={['USD', 'CNY', 'EUR'].map((value) => ({ label: value, value }))} />
              </Form.Item>
              <Form.Item label="最长时效要求(天)" name="maxDaysRequired">
                <InputNumber className="full-width" min={1} />
              </Form.Item>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item label="含电池" name="hasBattery" initialValue={0}>
                    <Select options={[{ label: '否', value: 0 }, { label: '是', value: 1 }]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="含液体" name="hasLiquid" initialValue={0}>
                    <Select options={[{ label: '否', value: 0 }, { label: '是', value: 1 }]} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="含粉末" name="hasPowder" initialValue={0}>
                    <Select options={[{ label: '否', value: 0 }, { label: '是', value: 1 }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" block icon={<ThunderboltOutlined />} htmlType="submit" loading={recommendMutation.isPending}>
                一键推荐
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={16}>
          <Card className="panel-card" variant="borderless" title="推荐渠道">
            {recommendMutation.isError ? <Alert className="compact-alert" showIcon type="error" title="物流推荐接口请求失败，请检查 TMS 服务和渠道基础数据。" /> : null}
            {!recommendMutation.data && !recommendMutation.isPending ? <Typography.Text type="secondary">提交包裹参数后展示真实接口返回的推荐结果。</Typography.Text> : null}
            {recommendMutation.data && !recommendations.length ? <Alert className="compact-alert" showIcon type="warning" title="当前条件下没有匹配的物流渠道。" /> : null}
            <Row gutter={[12, 12]}>
              {recommendations.map((item, index) => (
                <Col xs={24} md={12} key={`${item.channelId}-${index}`}>
                  <div className="recommend-card">
                    <Space align="start" className="full-width" orientation="vertical">
                      <Tag color={index === 0 ? 'green' : 'blue'}>TOP {index + 1}</Tag>
                      <Typography.Title level={4}>{item.channelName}</Typography.Title>
                      <Typography.Text type="secondary">{item.tips || '-'}</Typography.Text>
                      <Space wrap>
                        <Tag>{item.channelCode || '-'}</Tag>
                        <Tag>{formatAmount(item.estimatedFee, item.currency || 'USD')}</Tag>
                        <Tag>{item.minDays}-{item.maxDays} 天</Tag>
                        <Tag color="purple">评分 {item.totalScore}</Tag>
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

export function RealAiQueryPage() {
  const [form] = Form.useForm()
  const [result, setResult] = useState<AiQueryResult | null>(null)
  const { data: templates = [], isError: templatesError } = useQuery({ queryKey: ['bi', 'ai-templates'], queryFn: fetchAiTemplates })
  const queryMutation = useMutation({ mutationFn: queryAiAnalysis, onSuccess: setResult })
  const tableRows = result?.tableData || []
  const tableColumns = Object.keys(tableRows[0] || {}).slice(0, 8).map((key) => ({
    title: aiResultLabel(key),
    dataIndex: key,
    width: aiResultColumnWidth(key),
    ellipsis: true,
    align: 'center' as const,
    render: valueText,
  }))

  return (
    <PageWrapper title="AI 智能查询" description="输入经营分析问题，调用真实 BI AI 查询接口生成分析结果。" breadcrumbs={['卖家工作台', '数据分析', 'AI 智能查询']}>
      <Card className="panel-card" variant="borderless">
        <Space orientation="vertical" size={16} className="full-width">
          <RobotOutlined className="large-muted-icon" />
          <Form form={form} layout="vertical" className="full-width" onFinish={(values) => queryMutation.mutate(String(values.question || '').trim())}>
            <Form.Item name="question" label="分析问题" rules={[{ required: true, message: '请输入分析问题' }]}>
              <Input.TextArea rows={3} placeholder="例如：最近 30 天哪些 SKU 亏损了？" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={queryMutation.isPending}>
              执行分析
            </Button>
          </Form>
          {queryMutation.isError ? <Alert className="compact-alert" showIcon type="error" title="AI 查询接口请求失败，请检查 BI 服务。" /> : null}
          <Space wrap>
            {templates.map((item) => (
              <Button key={item.question} onClick={() => form.setFieldsValue({ question: item.question })}>
                {item.name}
              </Button>
            ))}
          </Space>
          {templatesError ? <Typography.Text type="secondary">快捷模板加载失败，仍可手动输入问题。</Typography.Text> : null}
          {result ? (
            <Space orientation="vertical" size={12} className="full-width">
              <Alert showIcon type="success" title={result.aiAnalysis || '分析完成'} />
              {result.sqlGenerated ? <Typography.Text type="secondary">查询规则：{result.sqlGenerated}</Typography.Text> : null}
              <Table rowKey={(_, index) => String(index)} size="small" pagination={false} scroll={{ x: 900 }} columns={tableColumns} dataSource={tableRows} />
            </Space>
          ) : null}
        </Space>
      </Card>
    </PageWrapper>
  )
}
