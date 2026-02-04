/**
 * Типы для API endpoints
 */

import { UserRole, TaskStatus } from '@prisma/client'

/**
 * Базовые типы запросов и ответов
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  code?: string
  details?: Record<string, unknown>
}

export interface ApiErrorResponse {
  error: string
  code: string
  details?: Record<string, unknown>
}

/**
 * Типы для /api/auth
 */
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    tenantId: string | null
  }
}

/**
 * Типы для /api/tasks
 */
export interface TaskResponse {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  dueDate: string | null
  completedAt: string | null
  confirmedAt: string | null
  creator: {
    name: string
  }
  assignee: {
    name: string
  } | null
  creatorId: string
  tenantId: string
  vehicleId: string | null
  orderId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  assigneeId?: string
  vehicleId?: string
  orderId?: string
  dueDate?: string
}

export type GetTasksResponse = TaskResponse[]

/**
 * Типы для /api/search
 */
export interface SearchRequest {
  query: string
}

export interface SearchResult {
  type: 'vehicle' | 'task' | 'order' | 'user'
  id: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Глобальный поиск (шапка CRM): фактический ответ `/api/search`
 * Возвращает результаты, сгруппированные по сущностям.
 */
export type GlobalSearchResults = {
  vehicles: unknown[]
  orders: unknown[]
  tachographs: unknown[]
  skzi: unknown[]
  cards: unknown[]
  customers: unknown[]
}

/**
 * @deprecated Ранее использовавшийся формат ответа. Оставлен для совместимости.
 */
export interface SearchResponse {
  results: SearchResult[]
  count: number
}

/**
 * Типы для /api/admin/tenants
 */
export interface TenantResponse {
  id: string
  name: string
  inn: string
  isActive: boolean
  isBlocked: boolean
  subscriptionExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type GetTenantsResponse = TenantResponse[]

export interface CreateTenantRequest {
  name: string
  inn: string
}

export interface UpdateTenantRequest {
  name?: string
  inn?: string
  isActive?: boolean
}

/**
 * Типы для /api/tasks/[id]/complete
 */
export type CompleteTaskResponse = TaskResponse

/**
 * Типы для /api/tasks/[id]/confirm
 */
export type ConfirmTaskResponse = TaskResponse

/**
 * Generic тип для API handler функций
 */
export type ApiHandler<TRequest = Request, TResponse = Response> = (
  request: TRequest
) => Promise<TResponse>
