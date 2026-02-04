/**
 * Unit tests for lib/utils.ts (boost branches/functions coverage)
 */

import { parseComment, parseSearchQuery, requireTenant } from '@/lib/utils'

describe('lib/utils', () => {
  describe('requireTenant', () => {
    it('throws when tenantId is missing', () => {
      expect(() => requireTenant(null)).toThrow('Tenant ID is required')
      expect(() => requireTenant(undefined)).toThrow('Tenant ID is required')
    })

    it('returns tenantId when present', () => {
      expect(requireTenant('tenant-1')).toBe('tenant-1')
    })
  })

  describe('parseSearchQuery', () => {
    it('detects INN (10/12 digits)', () => {
      expect(parseSearchQuery('1234567890')).toEqual({ type: 'inn', value: '1234567890' })
      expect(parseSearchQuery('123456789012')).toEqual({ type: 'inn', value: '123456789012' })
    })

    it('detects govNumber', () => {
      const r = parseSearchQuery('А123ВВ77')
      expect(r.type).toBe('govNumber')
      expect(r.value).toBe('А123ВВ77')
    })

    it('detects VIN (17 chars)', () => {
      const r = parseSearchQuery('WDB12345678901234')
      expect(r.type).toBe('vin')
      expect(r.value).toBe('WDB12345678901234')
    })

    it('detects serial', () => {
      const r = parseSearchQuery('abc12345')
      expect(r.type).toBe('serial')
      expect(r.value).toBe('ABC12345')
    })

    it('detects name (cyrillic)', () => {
      const r = parseSearchQuery('Иванов')
      expect(r.type).toBe('name')
      expect(r.value).toBe('Иванов')
    })

    it('falls back to general', () => {
      const r = parseSearchQuery('что-то сложное 123')
      expect(r.type).toBe('general')
      expect(r.value).toBe('что-то сложное 123')
    })
  })

  describe('parseComment', () => {
    it('returns null action when no hints', () => {
      expect(parseComment('просто текст')).toEqual({ action: null })
    })

    it('detects gov number and sets create_order', () => {
      const r = parseComment('Поставить на А123ВВ77')
      expect(r.action).toBe('create_order')
      expect(r.vehicleInfo?.govNumber).toBe('А123ВВ77')
    })

    it('detects type SKZI', () => {
      const r = parseComment('Замена СКЗИ')
      expect(r.action).toBe('create_order')
      expect(r.vehicleInfo?.type).toBe('SKZI_REPLACEMENT')
    })

    it('detects type CALIBRATION', () => {
      const r = parseComment('Нужна калибровка')
      expect(r.action).toBe('create_order')
      expect(r.vehicleInfo?.type).toBe('CALIBRATION')
    })

    it('detects type BATTERY_REPLACEMENT', () => {
      const r = parseComment('Замена батарейки')
      expect(r.action).toBe('create_order')
      expect(r.vehicleInfo?.type).toBe('BATTERY_REPLACEMENT')
    })

    it('detects type CARD_ISSUE', () => {
      const r = parseComment('карта водителя')
      expect(r.action).toBe('create_order')
      expect(r.vehicleInfo?.type).toBe('CARD_ISSUE')
    })
  })
})
