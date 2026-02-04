'use client'

import { useEffect, useCallback, useRef } from 'react'

const STORAGE_PREFIX = 'form-draft-'

export interface UseFormDraftOptions {
  key: string
  enabled?: boolean // Включить/выключить автосохранение
  debounceMs?: number // Задержка перед сохранением (по умолчанию 500ms)
}

export function useFormDraft<T extends Record<string, any>>(
  options: UseFormDraftOptions,
  formData: T,
  dependencies: any[] = []
) {
  const { key, enabled = true, debounceMs = 500 } = options
  const storageKey = `${STORAGE_PREFIX}${key}`
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRestoringRef = useRef(false)

  // Сохранение данных в localStorage с debounce
  useEffect(() => {
    if (!enabled || isRestoringRef.current) {
      isRestoringRef.current = false
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData))
      } catch (error) {
        console.warn('Failed to save form draft to localStorage:', error)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [formData, storageKey, enabled, debounceMs, ...dependencies])

  // Загрузка данных из localStorage
  const loadDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        isRestoringRef.current = true
        return JSON.parse(stored) as T
      }
    } catch (error) {
      console.warn('Failed to load form draft from localStorage:', error)
    }
    return null
  }, [storageKey])

  // Очистка данных из localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear form draft from localStorage:', error)
    }
  }, [storageKey])

  // Проверка наличия черновика
  const hasDraft = useCallback((): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null
    } catch {
      return false
    }
  }, [storageKey])

  // Принудительное сохранение (без debounce)
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData))
    } catch (error) {
      console.warn('Failed to save form draft to localStorage:', error)
    }
  }, [storageKey, formData])

  return {
    loadDraft,
    clearDraft,
    hasDraft,
    saveDraft,
  }
}
