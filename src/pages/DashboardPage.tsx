import { ArrowDownOutlined, ArrowUpOutlined, BellOutlined, ShoppingCartOutlined, WarningOutlined, DollarOutlined, InboxOutlined, OrderedListOutlined, RiseOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'

function getKpiIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('gmv') || t.includes('销售') || t.includes('额') || t.includes('利润') || t.includes('付')) {
    return <DollarOutlined />
  }
  if (t.includes('订单') || t.includes('售')) {
    return <OrderedListOutlined />
  }
  if (t.includes('库存') || t.includes('sku') || t.includes('仓') || t.includes('盘')) {
    return <InboxOutlined />
  }
  if (t.includes('率') || t.includes('增长') || t.includes('kpi') || t.includes('达成')) {
    return <RiseOutlined />
  }
  return <ShoppingCartOutlined />
}

function getKpiCardClass(title: string) {
  const t = title.toLowerCase()
  if (t.includes('gmv') || t.includes('销售') || t.includes('额') || t.includes('利润') || t.includes('付')) {
    return 'kpi-card-indigo'
  }
  if (t.includes('订单') || t.includes('售')) {
    return 'kpi-card-blue'
  }
  if (t.includes('库存') || t.includes('sku') || t.includes('仓') || t.includes('盘')) {
    return 'kpi-card-teal'
  }
  if (t.includes('率') || t.includes('增长') || t.includes('kpi') || t.includes('达成')) {
    return 'kpi-card-purple'
  }
  return 'kpi-card-indigo'
}
import EChartsReactCoreModule from 'echarts-for-react/lib/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useMemo } from 'react'
import { fetchDashboard } from '../api/bi'
import { isMockAllowed } from '../api/request'
import { PageWrapper } from '../components/PageWrapper'
import { StatusTag } from '../components/StatusTag'
import { usePermission } from '../hooks/usePermission'
import { formatAmount, sourceLabel, warningText } from '../utils/format'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])
const ReactEChartsCore = (EChartsReactCoreModule as unknown as { default?: typeof EChartsReactCoreModule }).default || EChartsReactCoreModule

export function DashboardPage() {
  const { data, isFetching, isError } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, refetchInterval: 300_000 })
  const { can } = usePermission()
  const visibleKpis = data?.kpis.filter((item) => can(item.permission)) || []
  const todos = data?.todos.filter((item) => can(item.permission)) || []
  const stockWarnings = data?.stockWarnings || []

  const trendOption = useMemo(
    () => {
      const salesTrend = data?.salesTrend || []
      return {
        color: ['#6366f1', '#10b981', '#f59e0b'],
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderWidth: 0,
          shadowColor: 'rgba(15, 23, 42, 0.08)',
          shadowBlur: 12,
          textStyle: { color: '#0f172a', fontSize: 12 },
          extraCssText: 'backdrop-filter: blur(10px); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03) !important;',
        },
        legend: { top: 0, icon: 'circle', textStyle: { color: '#475569', fontSize: 12 } },
        grid: { left: 45, right: 15, top: 48, bottom: 30 },
        xAxis: {
          type: 'category',
          data: salesTrend.map((item) => item.date),
          axisLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.05)' } },
          axisLabel: { color: '#64748b', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.03)' } },
          axisLabel: { color: '#64748b', fontSize: 11 },
        },
        series: [
          {
            name: 'GMV',
            type: 'line',
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 3.5 },
            data: salesTrend.map((item) => item.gmv),
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(99, 102, 241, 0.24)' },
                  { offset: 1, color: 'rgba(99, 102, 241, 0.0)' },
                ],
              },
            },
          },
          {
            name: '净利润',
            type: 'bar',
            barWidth: '22%',
            itemStyle: { borderRadius: [5, 5, 0, 0] },
            data: salesTrend.map((item) => item.profit),
          },
          {
            name: '订单量',
            type: 'line',
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, type: 'dashed' },
            data: salesTrend.map((item) => item.orders),
          },
        ],
      }
    },
    [data?.salesTrend],
  )

  const platformOption = useMemo(
    () => ({
      color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderWidth: 0,
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowBlur: 12,
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'backdrop-filter: blur(10px); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03) !important;',
      },
      legend: { bottom: 0, icon: 'circle', textStyle: { color: '#475569', fontSize: 11 } },
      series: [
        {
          type: 'pie',
          radius: ['52%', '76%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#ffffff', borderWidth: 3 },
          label: { show: false },
          emphasis: { label: { show: false } },
          data: data?.platformShare || [],
        },
      ],
    }),
    [data?.platformShare],
  )

  return (
    <PageWrapper
      title="首页 Dashboard"
      description="汇总采购、库存、订单、财务与待办事项，帮助租户团队快速判断当天的经营状态。"
      breadcrumbs={['卖家工作台', '首页']}
      extra={<Tag color={isError && isMockAllowed ? 'warning' : isFetching ? 'processing' : 'success'}>{isError && isMockAllowed ? '演示数据' : isFetching ? '同步中' : sourceLabel(data?.dataSource)}</Tag>}
    >
      {data?.dataSource === 'mock' ? <Alert className="compact-alert" showIcon type="warning" title="首页当前处于开发演示模式，数据仅用于页面验收。" /> : null}

      <Row gutter={[16, 16]}>
        {visibleKpis.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card className={`stat-card hover-lift ${getKpiCardClass(item.title)}`} variant="borderless">
              <span className="stat-label">{item.title}</span>
              <div className="stat-card-main">
                <span className="stat-value">{item.unit ? formatAmount(item.value, item.unit) : item.value.toLocaleString('zh-CN')}</span>
                <div className="stat-icon">
                  {getKpiIcon(item.title)}
                </div>
              </div>
              <div className={item.change >= 0 ? 'trend-up' : 'trend-down'}>
                {item.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} 环比 {Math.abs(item.change)}%
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="panel-card" variant="borderless" title="销售趋势">
            <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="panel-card" variant="borderless" title="平台销售占比">
            <ReactEChartsCore echarts={echarts} option={platformOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card className="panel-card" variant="borderless" title="角色待办">
            <Space orientation="vertical" className="full-width" size={12}>
              {todos.map((todo) => (
                <div className="todo-item" key={todo.id}>
                  <div>
                    <Typography.Text strong>{todo.title}</Typography.Text>
                    <div className="muted-text">
                      {todo.module} · {todo.deadline}
                    </div>
                  </div>
                  <Tag color={todo.priority === 'high' ? 'red' : todo.priority === 'medium' ? 'orange' : 'blue'}>{todo.priority}</Tag>
                </div>
              ))}
              {!todos.length ? (
                <div className="todo-item muted-text">
                  <BellOutlined /> 当前没有待办事项
                </div>
              ) : null}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="panel-card" variant="borderless" title="库存预警 SKU">
            <Table
              rowKey={(row) => `${row.warehouseId || row.warehouse}-${row.skuCode}`}
              size="small"
              pagination={false}
              dataSource={stockWarnings}
              columns={[
                { title: 'SKU', dataIndex: 'skuCode' },
                { title: '仓库', dataIndex: 'warehouse' },
                { title: '可售', dataIndex: 'availableQty', align: 'right' },
                { title: '状态', dataIndex: 'warningStatus', render: (value) => <StatusTag value={warningText(String(value))} /> },
              ]}
            />
            <div className="warning-footer">
              <WarningOutlined /> 零库存和低于安全库存的 SKU 会优先进入补货待办。
            </div>
          </Card>
        </Col>
      </Row>
    </PageWrapper>
  )
}
