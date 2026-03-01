declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string });
    query<Row = Record<string, unknown>>(
      sql: string,
      params?: unknown[]
    ): Promise<{ rows: Row[] }>;
    end(): Promise<void>;
  }
}
