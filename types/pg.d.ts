declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string
  }

  export class Pool {
    constructor(config?: PoolConfig)
  }

  export class Client {
    constructor(config?: PoolConfig)
    connect(): Promise<void>
    query(sql: string, params?: ReadonlyArray<unknown>): Promise<unknown>
    end(): Promise<void>
  }
}
