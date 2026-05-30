# FlexChain 卖家工作台前端

FlexChain 卖家工作台前端是柔性供应链 SaaS 平台的商家/卖家侧运营控制台，面向跨境卖家的日常业务。项目围绕真实接口、租户隔离、RBAC 权限、业务状态流转和跨模块操作闭环建设，不是单纯的静态页面演示。

## 页面预览

### 首页 Dashboard

![首页 Dashboard](docs/images/dashboard.png)

### 供应商列表

![供应商列表](docs/images/supplier-list.png)

## 核心功能

- 首页 Dashboard：展示 GMV、采购、库存、待办、预警和趋势图。
- SRM 供应商管理：供应商查询、详情、编辑、启停和审核状态展示。
- PIM 商品管理：SPU/SKU、上下架状态、价格、素材和商品主档维护。
- PMS 采购管理：采购申请、询价、采购订单、采购详情和业务操作。
- WMS 仓储库存：仓库、库存、入库、出库、盘点和库存流水。
- OMS 订单管理：订单查询、审核、取消、异常、退款和履约联动。
- TMS 物流管理：运单、物流渠道、轨迹、费用和推荐能力。
- FMS 财务管理：应付账款、付款记录、平台账单、利润和现金流。
- BI 数据分析：KPI、补货建议、智能分析结果和业务看板。
- System 系统管理：用户管理、角色权限、消息中心和权限点控制。

## 技术栈

React 19、TypeScript、Vite、Ant Design 6、TanStack Query、React Router、Zustand、Axios、ECharts、ESLint。

## 目录结构

```text
.
|-- public/          静态资源
|-- scripts/         本地审计和链路验证脚本
|-- src/
|   |-- api/         接口客户端和响应适配
|   |-- components/  通用组件
|   |-- data/        开发兜底数据，仅限显式开启
|   |-- hooks/       通用 Hook
|   |-- pages/       业务页面和页面配置
|   |-- routes/      路由元信息和注册
|   |-- store/       前端状态管理
|   |-- types/       TypeScript 类型
|   `-- utils/       格式化、权限和反馈工具
```

## 本地启动

```powershell
npm install
npm run dev
```

构建和检查：

```powershell
npm run lint
npm run build
```

## SQL 使用流程

前端依赖后端仓库 `supplychain-10` 提供接口和数据库。新环境请先在后端仓库执行：

```sql
source sql/00_full_schema.sql;
source sql/01_demo_seed.sql;
```

执行顺序：

1. `00_full_schema.sql`：创建 `supplychain_dev` 数据库并重建全部表结构。
2. `01_demo_seed.sql`：写入租户、用户、角色、权限、菜单、字典、演示业务数据和仓储专员账号。
3. 启动后端服务或网关。
4. 启动本前端项目。

注意：`00_full_schema.sql` 包含 `DROP TABLE IF EXISTS`，适合新环境或演示库初始化，不要直接用于生产在线迁移。

## Mock 策略

项目默认走真实后端接口。开发兜底 mock 默认关闭，只有显式配置后才允许开启：

```env
VITE_ENABLE_MOCK_FALLBACK=true
```

不要在联调、验收、面试展示或生产类似环境中开启 mock fallback。接口失败应该暴露真实错误，而不是用假数据掩盖问题。

## 验证脚本

```powershell
npm run audit:buttons
npm run audit:rbac
npm run audit:db
npm run audit:chain
npm run audit:purchase-chain
```

## 开发约定

- 页面展示中文，接口参数传数字状态或稳定 code，不能把中文状态传给后端 Integer 字段。
- 查询、重置、详情、审核、取消、入库、出库、付款等按钮必须调用真实接口。
- 操作成功后要刷新列表或详情数据。
- 危险操作必须二次确认。
- 无权限按钮不渲染。
- 不新增 mock/demo 数据掩盖真实联调问题。

## 鸣谢

感谢周顺方、刘付延强带来的 token 支持。
