/**
 * Utility types для замены any
 */

/**
 * SafeAny - используйте только когда действительно необходим any
 * ВСЕГДА добавляйте комментарий почему необходим any
 */

export type SafeAny = any

/**
 * UnknownObject - для объектов с неизвестной структурой
 * Предпочтительнее чем any
 */
export type UnknownObject = Record<string, unknown>

/**
 * UnknownArray - для массивов с неизвестным типом элементов
 */
export type UnknownArray = unknown[]

/**
 * JsonValue - для JSON значений
 */
export type JsonPrimitive = string | number | boolean | null

export interface JsonObject {
  [key: string]: JsonValue
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonArray extends Array<JsonValue> {}

export type JsonValue = JsonPrimitive | JsonObject | JsonArray

/**
 * Generic для обработки ошибок
 */
export type ErrorDetails = {
  field?: string
  message?: string
  code?: string
  [key: string]: unknown
}
