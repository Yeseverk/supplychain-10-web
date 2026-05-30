import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (!normalized.includes('node_modules')) return undefined
          if (normalized.includes('node_modules/echarts/lib/')) {
            const section = normalized.split('node_modules/echarts/lib/')[1]?.split('/')[0]
            return section ? `echarts-${section}` : 'echarts-core'
          }
          if (normalized.includes('node_modules/zrender/lib/')) {
            const section = normalized.split('node_modules/zrender/lib/')[1]?.split('/')[0]
            return section ? `zrender-${section}` : 'zrender-core'
          }
          if (normalized.includes('node_modules/echarts')) return 'echarts-entry'
          if (normalized.includes('node_modules/zrender')) return 'zrender-entry'
          if (normalized.includes('node_modules/@ant-design/icons')) return 'antd-icons'
          if (normalized.includes('node_modules/antd/es/')) {
            const component = normalized.split('node_modules/antd/es/')[1]?.split('/')[0]
            return component ? `antd-${component}` : 'antd-core'
          }
          if (normalized.includes('node_modules/@ant-design')) return 'antd-core'
          if (normalized.includes('node_modules/rc-') || normalized.includes('node_modules/@rc-component')) return 'antd-rc'
          if (normalized.includes('node_modules/@tanstack')) return 'query'
          if (normalized.includes('node_modules/react') || normalized.includes('node_modules/react-router') || normalized.includes('node_modules/zustand')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9200',
        changeOrigin: true,
      },
    },
  },
})
