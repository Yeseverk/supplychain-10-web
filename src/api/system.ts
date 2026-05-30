import { messages, pageOf } from '../data/mock'
import type { PageParams, PageResult } from '../types'
import { adaptPage, idOf, number, text } from './helpers'
import { request, shouldUseMock } from './request'

export type MessageItem = {
  id: string
  title: string
  content: string
  type: string
  readStatus: number
  createdAt: string
}

type Row = Record<string, unknown>

export type SystemUser = {
  id: string
  username: string
  realName: string
  email: string
  phone: string
  status: number
  lastLoginTime: string
}

export type SystemRole = {
  id: string
  roleName: string
  roleCode: string
  status: number
  sortOrder: number
}

export type SystemMenu = {
  id: string
  menuName: string
  permissionCode: string
  parentId: string
  sortOrder: number
}

function adaptSystemUser(row: Row): SystemUser {
  return {
    id: idOf(row),
    username: text(row.username || row.email || row.account),
    realName: text(row.realName || row.nickname || row.username),
    email: text(row.email),
    phone: text(row.phone),
    status: number(row.status, 1),
    lastLoginTime: text(row.lastLoginTime || row.lastLoginAt || row.updateTime),
  }
}

function adaptSystemRole(row: Row): SystemRole {
  return {
    id: idOf(row),
    roleName: text(row.roleName || row.name),
    roleCode: text(row.roleCode || row.code),
    status: number(row.status, 1),
    sortOrder: number(row.sortOrder || row.sort),
  }
}

function adaptSystemMenu(row: Row): SystemMenu {
  return {
    id: idOf(row),
    menuName: text(row.menuName || row.name),
    permissionCode: text(row.permissionCode || row.perms || row.permission),
    parentId: text(row.parentId, '0'),
    sortOrder: number(row.sortOrder || row.sort),
  }
}

function adaptMessage(row: Row): MessageItem {
  return {
    id: idOf(row),
    title: text(row.title, '系统通知'),
    content: text(row.content, ''),
    type: text(row.type || row.bizType || row.priority, 'SYSTEM'),
    readStatus: number(row.readStatus),
    createdAt: text(row.createdAt || row.createTime, '-'),
  }
}

export async function fetchUnreadMessageCount(): Promise<number> {
  try {
    return await request<number>({ url: '/api/messages/unread-count' })
  } catch (error) {
    if (shouldUseMock(error)) return messages.filter((item) => item.readStatus === 0).length
    throw error
  }
}

export async function fetchMessages(params: PageParams): Promise<PageResult<MessageItem>> {
  try {
    return adaptPage(await request<PageResult<Row>>({ url: '/api/messages/page', params }), adaptMessage, params.pageNum, params.pageSize)
  } catch (error) {
    if (shouldUseMock(error)) return pageOf(messages, params.pageNum, params.pageSize)
    throw error
  }
}

export async function markMessageRead(id: string | number) {
  try {
    return await request<void>({ url: `/api/messages/${id}/read`, method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function markAllMessagesRead() {
  try {
    return await request<void>({ url: '/api/messages/read-all', method: 'put' })
  } catch (error) {
    if (shouldUseMock(error)) return undefined
    throw error
  }
}

export async function fetchSystemUsers(params: PageParams): Promise<PageResult<SystemUser>> {
  return adaptPage(await request<PageResult<Row>>({ url: '/api/system/users/page', params }), adaptSystemUser, params.pageNum, params.pageSize)
}

export async function unlockSystemUser(id: string | number) {
  return await request<void>({ url: `/api/system/users/${id}/unlock`, method: 'put' })
}

export async function updateSystemUserStatus(id: string | number, status: number) {
  return await request<void>({ url: `/api/system/users/${id}/status`, method: 'put', data: { status } })
}

export async function fetchSystemUserRoleIds(id: string | number): Promise<string[]> {
  const ids = await request<Array<string | number>>({ url: `/api/system/users/${id}/roles` })
  return ids.map(String)
}

export async function saveSystemUserRoles(id: string | number, roleIds: Array<string | number>) {
  return await request<void>({
    url: `/api/system/users/${id}/roles`,
    method: 'put',
    data: { roleIds: roleIds.map((item) => Number(item)).filter((item) => Number.isFinite(item)) },
  })
}

export async function fetchSystemRoles(params: PageParams): Promise<PageResult<SystemRole>> {
  return adaptPage(await request<PageResult<Row>>({ url: '/api/system/roles/page', params }), adaptSystemRole, params.pageNum, params.pageSize)
}

export async function fetchSystemRoleMenuIds(id: string | number): Promise<string[]> {
  const ids = await request<Array<string | number>>({ url: `/api/system/roles/${id}/menus` })
  return ids.map(String)
}

export async function saveSystemRoleMenus(id: string | number, menuIds: Array<string | number>) {
  return await request<void>({
    url: `/api/system/roles/${id}/menus`,
    method: 'put',
    data: { menuIds: menuIds.map((item) => Number(item)).filter((item) => Number.isFinite(item)) },
  })
}

export async function fetchSystemMenus(params: PageParams): Promise<PageResult<SystemMenu>> {
  return adaptPage(await request<PageResult<Row>>({ url: '/api/system/menus/page', params }), adaptSystemMenu, params.pageNum, params.pageSize)
}
