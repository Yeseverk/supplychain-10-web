import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'







import { useQuery } from '@tanstack/react-query'







import { Alert, App as AntApp, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Spin, Table, Tabs, Timeline, Typography, Upload } from 'antd'







import type { ColumnsType } from 'antd/es/table'







import { useEffect, useMemo, useState } from 'react'







import { useSearchParams } from 'react-router-dom'







import { PageWrapper } from '../../components/PageWrapper'







import { PermissionButton } from '../../components/PermissionButton'







import { useTable } from '../../hooks/useTable'







import type { PageParams } from '../../types'







import { setCommercialFeedbackApi, type CommercialPageConfig } from './pageConfigs'















type Props<T extends object> = {







  config: CommercialPageConfig<T>







}















type DrawerPayload = {







  title: string







  data?: unknown







  load?: () => Promise<unknown>







}















type FormOption = {







  label: string







  value: string | number







  extra?: Record<string, unknown>







}















type FormField = {







  name: string







  label: string







  type?: 'text' | 'number' | 'textarea' | 'select' | 'remote-select' | 'file' | 'hidden' | 'stocktake-items' | 'spec-values'







  required?: boolean







  options?: FormOption[]







  loadOptions?: () => Promise<FormOption[]>







  fillFields?: Record<string, string>







}















type FormPayload = {







  title: string







  fields: FormField[]







  initialValues?: Record<string, unknown>







  submit: (values: Record<string, unknown>) => Promise<unknown>







  successText?: string







}















const fieldLabels: Record<string, string> = {
  id: '记录 ID',
  supplierId: '供应商 ID',
  supplierCode: '供应商编码',
  supplierName: '供应商名称',
  supplierType: '供应商类型',
  contactName: '联系人',
  contactPhone: '联系电话',
  contactEmail: '联系邮箱',
  province: '省份',
  city: '城市',
  address: '地址',
  grade: '评级',
  score: '评分',
  status: '状态',
  version: '版本',
  spuId: 'SPU ID',
  spuCode: 'SPU 编码',
  spuName: '商品名称',
  skuId: 'SKU ID',
  skuCode: 'SKU 编码',
  skuName: 'SKU 名称',
  spec: '规格',
  specValues: '规格配置',
  categoryId: '分类 ID',
  categoryName: '类目',
  categoryPath: '分类路径',
  brand: '品牌',
  warehouseId: '仓库 ID',
  warehouseName: '仓库名称',
  warehouseCode: '仓库编码',
  warehouse: '仓库',
  locationId: '库位 ID',
  locationCode: '库位编码',
  zone: '库区',
  reqId: '采购申请 ID',
  reqNo: '申请单号',
  title: '标题',
  applicantId: '申请人 ID',
  applicantName: '申请人',
  inquiryId: '询价单 ID',
  inquiryNo: '询价单号',
  poId: '采购单 ID',
  poNo: '采购单号',
  orderId: '订单 ID',
  orderNo: '订单号',
  platformOrderNo: '平台订单号',
  outboundId: '出库单 ID',
  outboundNo: '出库单号',
  inboundId: '入库单 ID',
  inboundNo: '入库单号',
  receiptId: '收货单 ID',
  receiptNo: '收货单号',
  payableId: '应付单 ID',
  payableNo: '应付单号',
  paymentId: '付款记录 ID',
  paymentAmount: '付款金额',
  paymentDate: '付款日期',
  paymentMethod: '付款方式',
  voucherNo: '付款凭证号',
  operatorId: '经办人 ID',
  operatorName: '经办人',
  billId: '账单 ID',
  billNo: '账单号',
  platform: '平台',
  storeId: '店铺 ID',
  storeName: '店铺',
  waybillId: '运单 ID',
  waybillNo: '运单号',
  trackingNo: '物流商单号',
  carrierId: '物流商 ID',
  carrierName: '物流商',
  channelId: '渠道 ID',
  channelName: '渠道',
  currentTrack: '当前轨迹',
  trackTime: '轨迹时间',
  trackDesc: '轨迹描述',
  countryCode: '国家代码',
  quantity: '数量',
  plannedQty: '计划数量',
  actualQty: '实盘数量',
  passQty: '合格数量',
  rejectQty: '不合格数量',
  salePrice: '销售价格',
  originCountry: '原产国',
  material: '材质',
  spuDesc: '商品描述',
  packageDesc: '包装描述',
  skuCount: 'SKU 数量',
  mainImage: '主图',
  images: '商品图片',
  unit: '单位',
  weight: '重量',
  grossWeight: '毛重',
  netWeight: '净重',
  costPrice: '成本价',
  amount: '金额',
  paidAmount: '已付金额',
  currency: '币种',
  unitPrice: '单价',
  totalAmount: '总金额',
  dueDate: '到期日',
  createdAt: '创建时间',
  createTime: '创建时间',
  updatedAt: '更新时间',
  updateTime: '更新时间',
  operatedAt: '操作时间',
  operator: '操作人',
  time: '时间',
  content: '内容',
  message: '消息',
  remark: '备注',
}















function labelText(key: string) {



  return fieldLabels[key] || key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')



}







function isDisplayableRecordValue(value: unknown) {



  return value !== undefined && value !== null && typeof value !== 'function' && !Array.isArray(value)



}







function valueText(value: unknown) {



  if (value === null || value === undefined || value === '') return '-'



  if (typeof value === 'boolean') return value ? '是' : '否'



  if (typeof value === 'object') return JSON.stringify(value)



  return String(value)



}







function recordColumnWidth(key: string) {



  if (/id$/i.test(key)) return 130



  if (/amount|price|qty|quantity|fee/i.test(key)) return 118



  if (/date|time|created|updated/i.test(key)) return 150



  if (/remark|content|desc|track/i.test(key)) return 220



  if (/no|code/i.test(key)) return 170



  return 140



}







function renderRecordContent(data: unknown) {



  if (!data) return <Typography.Text type="secondary">暂无数据</Typography.Text>



  if (Array.isArray(data)) {



    if (!data.length) return <Typography.Text type="secondary">暂无明细</Typography.Text>



    const keys = Object.keys((data[0] || {}) as Record<string, unknown>).filter((key) => key !== 'tenantId').slice(0, 10)



    const tableWidth = keys.reduce((total, key) => total + recordColumnWidth(key), 0)



    return (



      <Table



        size="small"



        rowKey={(row, index) => String((row as Record<string, unknown>).id || index)}



        pagination={false}



        dataSource={data as Record<string, unknown>[]}



        className="record-modal-table"



        scroll={{ x: Math.max(tableWidth, 760) }}



        columns={keys.map((key) => ({



          title: labelText(key),



          dataIndex: key,



          width: recordColumnWidth(key),



          ellipsis: true,



          align: 'center' as const,



          render: valueText,



        }))}



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



    <Descriptions className="record-descriptions" column={1} size="small" bordered>



      {Object.entries(row)



        .filter(([key, value]) => key !== 'tenantId' && isDisplayableRecordValue(value))



        .slice(0, 36)



        .map(([key, value]) => (



          <Descriptions.Item key={key} label={labelText(key)}>



            {valueText(value)}



          </Descriptions.Item>



        ))}



    </Descriptions>



  )



}







type EditableStocktakeItem = {







  itemId: string | number







  skuId: string | number







  skuCode: string







  skuName: string







  quantity: number







  actualQty: number







  locationId?: number







  locationCode?: string







  remark?: string







}























type EditableSpecValue = {







  key: string







  value: string







}















function normalizeSpecValues(value: unknown): EditableSpecValue[] {







  if (Array.isArray(value)) {







    return value







      .map((item) => ({







        key: String((item as Record<string, unknown>)?.key || ''),







        value: String((item as Record<string, unknown>)?.value || ''),







      }))







      .filter((item) => item.key || item.value)







  }







  if (value && typeof value === 'object') {







    return Object.entries(value as Record<string, unknown>).map(([key, itemValue]) => ({ key, value: String(itemValue ?? '') }))







  }







  if (typeof value === 'string' && value.trim()) {







    try {







      const parsed = JSON.parse(value) as unknown







      return normalizeSpecValues(parsed)







    } catch {







      return value







        .split(/[;,]/)







        .map((pair) => {







          const [key = '', itemValue = ''] = pair.split(/[:=]/)







          return { key: key.trim(), value: itemValue.trim() }







        })







        .filter((item) => item.key || item.value)







    }







  }







  return []







}















function SpecValuesEditor({ value, onChange }: { value?: unknown; onChange?: (value: EditableSpecValue[]) => void }) {







  const rows = normalizeSpecValues(value)







  const normalizedRows = rows.length ? rows : [{ key: '', value: '' }]















  const emit = (nextRows: EditableSpecValue[]) => {







    const compactRows = nextRows.filter((item, index) => item.key || item.value || index === nextRows.length - 1)







    onChange?.(compactRows.length ? compactRows : [{ key: '', value: '' }])







  }







  const updateRow = (index: number, patch: Partial<EditableSpecValue>) => {







    emit(normalizedRows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))







  }







  const addRow = () => emit([...normalizedRows, { key: '', value: '' }])







  const removeRow = (index: number) => emit(normalizedRows.filter((_, itemIndex) => itemIndex !== index))















  return (







    <Space orientation="vertical" className="full-width" size={8}>







      <Table<EditableSpecValue>







        size="small"







        rowKey={(_, index) => String(index)}







        pagination={false}







        dataSource={normalizedRows}







        columns={[







          {







            title: '规格项',







            dataIndex: 'key',







            align: 'center',







            render: (cellValue, _row, index) => <Input placeholder="如：颜色" value={String(cellValue || '')} onChange={(event) => updateRow(index, { key: event.target.value })} />,







          },







          {







            title: '规格值',







            dataIndex: 'value',







            align: 'center',







            render: (cellValue, _row, index) => <Input placeholder="如：黑色" value={String(cellValue || '')} onChange={(event) => updateRow(index, { value: event.target.value })} />,







          },







          {







            title: '操作',







            width: 80,







            align: 'center',







            render: (_cellValue, _row, index) => (







              <Button aria-label="删除规格" icon={<DeleteOutlined />} disabled={normalizedRows.length <= 1} onClick={() => removeRow(index)} />







            ),







          },







        ]}







      />







      <Button icon={<PlusOutlined />} onClick={addRow}>







        添加规格







      </Button>







    </Space>







  )







}















function StocktakeItemsEditor({ value = [], onChange }: { value?: EditableStocktakeItem[]; onChange?: (value: EditableStocktakeItem[]) => void }) {







  const updateRow = (index: number, patch: Partial<EditableStocktakeItem>) => {







    const next = value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))







    onChange?.(next)







  }















  return (







    <Table<EditableStocktakeItem>







      size="small"







      rowKey={(row) => String(row.itemId)}







      pagination={false}







      dataSource={value}







      columns={[







        { title: 'SKU 编码', dataIndex: 'skuCode', width: 140, ellipsis: true, align: 'center' },







        { title: '商品名称', dataIndex: 'skuName', width: 180, ellipsis: true, align: 'center' },







        { title: '库位', dataIndex: 'locationCode', width: 110, align: 'center', render: valueText },







        { title: '账面数量', dataIndex: 'quantity', width: 100, align: 'center' },







        {







          title: '实盘数量',







          dataIndex: 'actualQty',







          width: 130,







          align: 'center',







          render: (value, _row, index) => <InputNumber className="full-width" min={0} value={Number(value || 0)} onChange={(nextValue) => updateRow(index, { actualQty: Number(nextValue || 0) })} />,







        },







        {







          title: '备注',







          dataIndex: 'remark',







          width: 180,







          align: 'center',







          render: (value, _row, index) => <Input value={String(value || '')} onChange={(event) => updateRow(index, { remark: event.target.value })} />,







        },







      ]}







      scroll={{ x: 840 }}







    />







  )







}















export function CommercialListPage<T extends object>({ config }: Props<T>) {







  const [searchParams, setSearchParams] = useSearchParams()







  const initialTableParams = useMemo<Partial<PageParams>>(() => {







    const keyword = searchParams.get('keyword')?.trim()







    const status = searchParams.get('status')?.trim()







    const params: Partial<PageParams> = {}







    if (keyword) params.keyword = keyword







    if (status) {







      const numericStatus = Number(status)







      params.status = Number.isNaN(numericStatus) ? status : numericStatus







    }







    return params







  }, [searchParams])







  const table = useTable(initialTableParams)







  const { message: messageApi } = AntApp.useApp()







  const [filterForm] = Form.useForm()







  const [form] = Form.useForm()







  const [recordModal, setRecordModal] = useState<DrawerPayload | null>(null)







  const [recordData, setRecordData] = useState<unknown>()







  const [recordLoading, setRecordLoading] = useState(false)







  const [formDrawer, setFormDrawer] = useState<FormPayload | null>(null)







  const [formSubmitting, setFormSubmitting] = useState(false)







  const [remoteOptions, setRemoteOptions] = useState<Record<string, FormOption[]>>({})







  const { data, isFetching, refetch, isError } = useQuery({







    queryKey: [...config.queryKey, table.params],







    queryFn: () => config.fetcher(table.params),







  })







  const records = data?.records || []







  const centeredColumns = useMemo(
    () =>
      config.columns.map((column) => {
        const isActionColumn = column.title === '操作'
        return {
          align: 'center' as const,
          ...column,
          width: isActionColumn ? Math.max(Number(column.width || 0), 260) : column.width,
        }
      }) as ColumnsType<T>,
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















  const { setParams } = table







  useEffect(() => {







    filterForm.setFieldsValue({ keyword: initialTableParams.keyword })







    setParams((prev) => ({







      ...prev,







      pageNum: 1,







      keyword: initialTableParams.keyword,







      status: initialTableParams.status,







    }))







  }, [filterForm, initialTableParams.keyword, initialTableParams.status, setParams])















  useEffect(() => {







    const openFormDrawer = (event: Event) => {







      const payload = (event as CustomEvent<FormPayload>).detail







      setRemoteOptions({})







      setFormDrawer(payload)







      form.setFieldsValue(payload.initialValues || {})







    }







    window.addEventListener('flexchain:form-drawer', openFormDrawer)







    return () => window.removeEventListener('flexchain:form-drawer', openFormDrawer)







  }, [form])















  useEffect(() => {







    if (!formDrawer) return















    let cancelled = false







    formDrawer.fields







      .filter((field) => field.loadOptions)







      .forEach((field) => {







        field







          .loadOptions!()







          .then((options) => {







            if (!cancelled) setRemoteOptions((prev) => ({ ...prev, [field.name]: options }))







          })







          .catch(() => {







            if (!cancelled) setRemoteOptions((prev) => ({ ...prev, [field.name]: [] }))







          })







      })















    return () => {







      cancelled = true







    }







  }, [formDrawer])















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







    if (field.type === 'hidden') return <Input type="hidden" />







    if (field.type === 'stocktake-items') return <StocktakeItemsEditor />







    if (field.type === 'spec-values') return <SpecValuesEditor />







    if (field.type === 'textarea') return <Input.TextArea rows={3} />







    if (field.type === 'select' || field.type === 'remote-select') {







      const options = field.options || remoteOptions[field.name] || []







      const loading = Boolean(field.loadOptions && !remoteOptions[field.name])







      return (







        <Select







          showSearch







          allowClear







          loading={loading}







          optionFilterProp="label"







          options={options}







          onChange={(_, selected) => {







            const option = Array.isArray(selected) ? selected[0] : selected







            const extra = (option as FormOption | undefined)?.extra







            if (!extra || !field.fillFields) return







            const nextValues = Object.fromEntries(







              Object.entries(field.fillFields)







                .filter(([, extraKey]) => extra[extraKey] !== undefined)







                .map(([fieldName, extraKey]) => [fieldName, extra[extraKey]]),







            )







            form.setFieldsValue(nextValues)







          }}







        />







      )







    }







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







      setRecordModal(payload)







      setRecordData(payload.data)







      if (payload.load) {







        setRecordLoading(true)







        payload







          .load()







          .then(setRecordData)







          .catch((error) => {







            messageApi.error(error instanceof Error ? error.message : '详情加载失败')







            setRecordData(payload.data)







          })







          .finally(() => setRecordLoading(false))







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







                setSearchParams({})







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







      <Modal







        className="record-modal"







        title={recordModal?.title}







        width="min(800px, calc(100vw - 48px))"







        centered







        open={Boolean(recordModal)}







        onCancel={() => setRecordModal(null)}







        footer={null}







        destroyOnHidden







      >







        <Spin spinning={recordLoading}>







          <div className="record-modal-body">{renderRecordContent(recordData)}</div>







        </Spin>







      </Modal>
      <Modal
        className="record-modal form-modal"
        title={formDrawer?.title}
        width="min(860px, calc(100vw - 48px))"
        centered
        open={Boolean(formDrawer)}
        onCancel={() => setFormDrawer(null)}
        destroyOnHidden
        confirmLoading={formSubmitting}
        okText="保存"
        cancelText="取消"
        onOk={submitFormDrawer}
      >
        <div className="form-modal-body">
          <Form form={form} layout="vertical">
            {formDrawer?.fields.map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.type === 'hidden' ? undefined : field.label}
                hidden={field.type === 'hidden'}
                valuePropName={field.type === 'file' ? 'fileList' : undefined}
                rules={field.required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
              >
                {renderFormField(field)}
              </Form.Item>
            ))}
          </Form>
        </div>
      </Modal>







    </PageWrapper>







  )







}
