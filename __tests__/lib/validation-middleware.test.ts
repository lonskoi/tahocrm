/**
 * Unit tests for lib/validation/middleware.ts (branches + functions coverage)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  validateParams,
  validateQuery,
  validateRequest,
  withValidation,
} from '@/lib/validation/middleware'

describe('validation middleware', () => {
  describe('validateRequest', () => {
    it('returns data on valid body', async () => {
      const schema = z.object({ name: z.string().min(1) })
      const req = new NextRequest('http://localhost:3000/api/x', {
        method: 'POST',
        body: JSON.stringify({ name: 'A' }),
      })
      const res = await validateRequest(req, schema)
      expect(res.error).toBeNull()
      expect(res.data?.name).toBe('A')
    })

    it('returns 400 with VALIDATION_ERROR on zod error', async () => {
      const schema = z.object({ name: z.string().min(2) })
      const req = new NextRequest('http://localhost:3000/api/x', {
        method: 'POST',
        body: JSON.stringify({ name: 'A' }),
      })
      const res = await validateRequest(req, schema)
      expect(res.data).toBeNull()
      expect(res.error?.status).toBe(400)
    })

    it('returns 400 with INVALID_REQUEST on invalid json', async () => {
      const schema = z.object({ name: z.string() })
      const req = new NextRequest('http://localhost:3000/api/x', {
        method: 'POST',
        body: '{not json}',
        headers: { 'content-type': 'application/json' },
      })
      const res = await validateRequest(req, schema)
      expect(res.data).toBeNull()
      expect(res.error?.status).toBe(400)
    })
  })

  describe('validateQuery', () => {
    it('returns data on valid query', () => {
      const schema = z.object({ q: z.string().min(1) })
      const req = new NextRequest('http://localhost:3000/api/x?q=test')
      const res = validateQuery(req, schema)
      expect(res.error).toBeNull()
      expect(res.data?.q).toBe('test')
    })

    it('returns 400 on zod error', async () => {
      const schema = z.object({ q: z.string().min(2) })
      const req = new NextRequest('http://localhost:3000/api/x?q=a')
      const res = validateQuery(req, schema)
      expect(res.data).toBeNull()
      expect(res.error?.status).toBe(400)
    })
  })

  describe('validateParams', () => {
    it('uses first element when param is array', () => {
      const schema = z.object({ id: z.string().min(1) })
      const res = validateParams({ id: ['x', 'y'] }, schema)
      expect(res.error).toBeNull()
      expect(res.data?.id).toBe('x')
    })

    it('returns 400 when invalid', async () => {
      const schema = z.object({ id: z.string().min(2) })
      const res = validateParams({ id: 'x' }, schema)
      expect(res.data).toBeNull()
      expect(res.error?.status).toBe(400)
    })
  })

  describe('withValidation', () => {
    it('short-circuits on body validation error', async () => {
      const handler = jest.fn(async () => NextResponse.json({ ok: true }))
      const wrapped = withValidation({ body: z.object({ x: z.number() }) }, handler)
      const req = new NextRequest('http://localhost:3000/api/x', {
        method: 'POST',
        body: JSON.stringify({ x: 'nope' }),
      })
      const res = await wrapped(req)
      expect(res.status).toBe(400)
      expect(handler).not.toHaveBeenCalled()
    })

    it('passes parsed args to handler', async () => {
      const handler = jest.fn(async () => NextResponse.json({ ok: true }))
      const wrapped = withValidation(
        {
          body: z.object({ x: z.number() }),
          query: z.object({ q: z.string() }),
          params: z.object({ id: z.string() }),
        },
        handler
      )
      const req = new NextRequest('http://localhost:3000/api/x?q=1', {
        method: 'POST',
        body: JSON.stringify({ x: 1 }),
      })
      const res = await wrapped(req, { params: { id: 'abc' } })
      expect(res.status).toBe(200)
      expect(handler).toHaveBeenCalled()
    })
  })
})
