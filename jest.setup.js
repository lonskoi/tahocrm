// Настройка Jest для тестирования (CommonJS to avoid import hoisting issues)
require('@testing-library/jest-dom')

// Polyfills required by Next.js / undici in Jest(jsdom)
const { TextDecoder, TextEncoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

const { ReadableStream, WritableStream, TransformStream } = require('stream/web')
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

const { MessageChannel, MessagePort } = require('worker_threads')
global.MessageChannel = MessageChannel
global.MessagePort = MessagePort

const { fetch, Headers, Request, Response } = require('undici')
global.fetch = fetch
global.Headers = Headers
global.Request = Request
global.Response = Response

// Моки для Next.js
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

jest.mock('next-auth/react', () => ({
  useSession() {
    return {
      data: null,
      status: 'unauthenticated',
    }
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Глобальные моки
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}

