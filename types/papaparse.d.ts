declare module 'papaparse' {
  export interface ParseConfig<T = any> {
    header?: boolean
    skipEmptyLines?: boolean
    transformHeader?: (header: string) => string
    [key: string]: any
  }

  export interface ParseResult<T = any> {
    data: T[]
    errors: Array<{ type: string; code: string; message: string; row?: number }>
    meta: {
      delimiter: string
      linebreak: string
      aborted: boolean
      truncated: boolean
      cursor: number
    }
  }

  export interface ParseStatic {
    parse<T = any>(
      input: string | File,
      config?: ParseConfig<T>
    ): ParseResult<T>
  }

  const Papa: ParseStatic
  export default Papa
}

