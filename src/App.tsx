import { App as AntApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { lazy, Suspense, type ReactNode, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { DefaultLayout } from './layouts/DefaultLayout'
import { LoginPage } from './pages/LoginPage'
import { CommercialListPage } from './pages/commercial/CommercialListPage'
import { pageConfigs } from './pages/commercial/pageConfigs'
import { AiQueryPage, MessageCenterPage, SystemRolePage, SystemUserPage, TmsRecommendPage } from './pages/commercial/ActionPages'
import { useAuthStore } from './store/auth'
import { routeMeta } from './routes'
import { setFeedbackApi } from './utils/feedback'
import './index.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const PurchaseOrderDetailPage = lazy(() => import('./pages/pms/PurchaseOrderDetailPage').then((module) => ({ default: module.PurchaseOrderDetailPage })))

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function routeKeyOf(pathname: string) {
  if (pathname.startsWith('/pms/order/')) return '/pms/order'
  return routeMeta[pathname] ? pathname : '/dashboard'
}

function RequirePagePermission({ children }: { children: ReactNode }) {
  const location = useLocation()
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const permission = routeMeta[routeKeyOf(location.pathname)]?.permission
  if (!hasPermission(permission)) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="route-loading">正在加载工作台...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <RequirePagePermission>
                <DefaultLayout />
              </RequirePagePermission>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="srm/supplier" element={<CommercialListPage config={pageConfigs.suppliers} />} />
          <Route path="pim/spu" element={<CommercialListPage config={pageConfigs.spus} />} />
          <Route path="pim/sku" element={<CommercialListPage config={pageConfigs.skus} />} />
          <Route path="pms/requisition" element={<CommercialListPage config={pageConfigs.requisitions} />} />
          <Route path="pms/inquiry" element={<CommercialListPage config={pageConfigs.inquiries} />} />
          <Route path="pms/order" element={<CommercialListPage config={pageConfigs.purchaseOrders} />} />
          <Route path="pms/order/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="pms/payable" element={<CommercialListPage config={pageConfigs.payables} />} />
          <Route path="wms/warehouse" element={<CommercialListPage config={pageConfigs.warehouses} />} />
          <Route path="wms/inventory" element={<CommercialListPage config={pageConfigs.inventory} />} />
          <Route path="wms/inbound" element={<CommercialListPage config={pageConfigs.inbound} />} />
          <Route path="wms/outbound" element={<CommercialListPage config={pageConfigs.outbound} />} />
          <Route path="wms/stocktake" element={<CommercialListPage config={pageConfigs.stocktake} />} />
          <Route path="oms/order" element={<CommercialListPage config={pageConfigs.orders} />} />
          <Route path="oms/refund" element={<CommercialListPage config={pageConfigs.refunds} />} />
          <Route path="tms/waybill" element={<CommercialListPage config={pageConfigs.waybills} />} />
          <Route path="tms/channel" element={<CommercialListPage config={pageConfigs.channels} />} />
          <Route path="tms/recommend" element={<TmsRecommendPage />} />
          <Route path="fms/payable" element={<CommercialListPage config={pageConfigs.payables} />} />
          <Route path="fms/bill" element={<CommercialListPage config={pageConfigs.bills} />} />
          <Route path="fms/profit" element={<CommercialListPage config={pageConfigs.profits} />} />
          <Route path="fms/cashflow" element={<CommercialListPage config={pageConfigs.cashflows} />} />
          <Route path="bi/kpi" element={<CommercialListPage config={pageConfigs.kpis} />} />
          <Route path="bi/reorder" element={<CommercialListPage config={pageConfigs.reorder} />} />
          <Route path="bi/ai" element={<AiQueryPage />} />
          <Route path="system/user" element={<SystemUserPage />} />
          <Route path="system/role" element={<SystemRolePage />} />
          <Route path="system/message" element={<MessageCenterPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function FeedbackBridge({ children }: { children: ReactNode }) {
  const { message: messageApi, modal, notification: notificationApi } = AntApp.useApp()

  useEffect(() => {
    setFeedbackApi({
      warning: (content) => messageApi.warning(content),
      error: (content) => messageApi.error(content),
      notifyWarning: (title, description) => notificationApi.warning({ message: title, description }),
      confirm: (config) => modal.confirm(config),
    })
  }, [messageApi, modal, notificationApi])

  return children
}

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#10a37f',
          colorInfo: '#2563eb',
          colorSuccess: '#10b981',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          borderRadius: 8,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Layout: { headerBg: 'rgba(255,255,255,0.88)', siderBg: '#101318', bodyBg: '#f7f8fa' },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemSelectedBg: '#242a35',
            itemSelectedColor: '#ffffff',
            itemHoverBg: '#1c212b',
            itemHoverColor: '#ffffff',
            itemColor: '#c6cad2',
            itemBorderRadius: 8,
          },
          Card: { borderRadiusLG: 10 },
          Table: { headerBg: '#f8fafc', rowHoverBg: '#f7fbfa', headerSplitColor: '#e6e8ec' },
          Button: { borderRadius: 8, borderRadiusLG: 10 },
          Input: { borderRadius: 8, borderRadiusLG: 10 },
          Select: { borderRadius: 10, borderRadiusLG: 12 },
          Tag: { borderRadiusSM: 6 },
        },
      }}
    >
      <AntApp>
        <FeedbackBridge>
          <BrowserRouter>
            <AppErrorBoundary>
              <AppRoutes />
            </AppErrorBoundary>
          </BrowserRouter>
        </FeedbackBridge>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
