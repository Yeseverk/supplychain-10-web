import { useState } from 'react'
import type { PageParams } from '../types'

export function useTable(initial?: Partial<PageParams>) {
  const [params, setParams] = useState<PageParams>({
    pageNum: 1,
    pageSize: 20,
    sortField: 'createdAt',
    sortOrder: 'DESC',
    ...initial,
  })

  const search = (values: Record<string, unknown>) => {
    setParams((prev) => {
      const next: Record<string, unknown> = { ...prev, ...values, pageNum: 1 }
      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          delete next[key]
        }
      })
      return next as PageParams
    })
  }

  const reset = () => {
    setParams({ pageNum: 1, pageSize: 20, sortField: 'createdAt', sortOrder: 'DESC', ...initial })
  }

  const changePage = (pageNum: number, pageSize?: number) => {
    setParams((prev) => ({ ...prev, pageNum, pageSize: pageSize || prev.pageSize }))
  }

  return { params, setParams, search, reset, changePage }
}
