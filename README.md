# FlexChain Seller Workspace

FlexChain Seller Workspace is the frontend application for the FlexChain supply chain platform. It provides a seller-side operations console for product management, supplier management, procurement, warehouse inventory, order fulfillment, logistics, finance, system management, and BI dashboards.

The application is built with React, TypeScript, Vite, Ant Design, and TanStack Query. It communicates with backend microservices through real HTTP APIs and is designed around operational workflows, RBAC permissions, tenant-aware access, and module-level business actions.

## Features

- Seller dashboard with operational metrics, alerts, pending tasks, and business summaries.
- PIM pages for SPU/SKU management, product status, SKU pricing, and category-related data.
- SRM pages for supplier list, supplier details, approval, enable/disable, and supplier maintenance.
- PMS pages for purchase requisitions, inquiries, purchase orders, receipts, and purchase order detail.
- WMS pages for warehouses, inventory, inbound orders, outbound orders, stocktake, and inventory logs.
- OMS pages for sales orders, order audit, sync, exception marking, cancellation, and refund processing.
- TMS pages for waybills, tracking, logistics channels, and logistics recommendation.
- FMS pages for payables, platform bills, profit reports, and cash flow.
- BI pages for KPI data, replenishment suggestions, and analytical tables.
- System pages for users, roles, permissions, and message center.
- Permission-aware buttons and route access based on RBAC permission codes.

## Technology Stack

- React 19
- TypeScript
- Vite
- Ant Design 6
- TanStack Query
- React Router
- Zustand
- Axios
- ECharts
- ESLint

## Directory Structure

```text
.
├── public/                 # Static assets
├── scripts/                # Local audit and integration verification scripts
├── src/
│   ├── api/                # API clients and response adapters
│   ├── components/         # Shared UI components
│   ├── data/               # Development-only fallback data
│   ├── hooks/              # Shared hooks
│   ├── pages/              # Business pages and page configs
│   ├── routes/             # Route metadata and route registration
│   ├── store/              # Frontend state management
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Formatters and feedback helpers
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Running FlexChain backend services or gateway

### Install

```powershell
npm install
```

### Development

```powershell
npm run dev
```

The Vite dev server is configured through `vite.config.ts`. Check the proxy and backend gateway address before starting local development.

### Build

```powershell
npm run build
```

### Lint

```powershell
npm run lint
```

## API And Mock Policy

The application is intended to use real backend APIs. Development mock fallback is disabled by default and should only be enabled explicitly for isolated UI development.

```env
VITE_ENABLE_MOCK_FALLBACK=true
```

Do not enable mock fallback for production-like verification, integration testing, or business workflow acceptance.

## Verification Scripts

The project includes local audit scripts for core cross-module workflows.

```powershell
npm run audit:rbac
npm run audit:chain
npm run audit:purchase-chain
```

Typical workflow verification:

- `audit:rbac` checks user, role, permission, menu, and message center APIs.
- `audit:chain` checks the OMS -> WMS -> TMS fulfillment chain.
- `audit:purchase-chain` checks the SRM -> PMS -> WMS -> FMS purchase and settlement chain.

## Development Notes

- UI labels and backend request values should be separated. For status filters, display Chinese labels in the UI but send numeric or stable code values to backend APIs.
- Buttons should call real APIs, refresh data after success, and show clear error messages after failure.
- Dangerous actions such as cancel, disable, approve, pay, ship, or mark-all-read should require confirmation.
- Permission buttons should use RBAC permission codes and should not render when the current user lacks access.
- Table, drawer, and form behavior should stay consistent across business modules.
