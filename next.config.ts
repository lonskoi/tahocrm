import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Отключаем некоторые экспериментальные функции, которые могут вызывать проблемы
  },
  // Next.js 16: Turbopack is enabled by default. We keep a tiny turbopack config to avoid
  // build-time errors when a webpack config is present (we only use webpack customization for dev watch ignore).
  turbopack: {},
  webpack: (config, { dev }) => {
    // Windows: prevent Watchpack from attempting to scan protected system folders on drive roots
    if (dev) {
      const watchOptions = config.watchOptions ?? {}
      const ignored = watchOptions.ignored
      const extraIgnored = [
        '**/System Volume Information/**',
        '**/$RECYCLE.BIN/**',
        '**/Recovery/**',
      ]

      // Webpack schema is strict; keep only string globs here.
      const existingGlobs = Array.isArray(ignored)
        ? ignored.filter((v): v is string => typeof v === 'string' && v.length > 0)
        : typeof ignored === 'string' && ignored.length > 0
          ? [ignored]
          : []

      config.watchOptions = { ...watchOptions, ignored: [...existingGlobs, ...extraIgnored] }
    }

    return config
  },
}

export default nextConfig
