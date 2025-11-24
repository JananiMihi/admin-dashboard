declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: {
      user: string
      pass: string
    }
    [key: string]: any
  }

  export interface Transporter {
    sendMail(options: {
      from?: string
      to: string
      subject: string
      html?: string
      text?: string
    }): Promise<any>
  }

  export function createTransport(options: TransportOptions): Transporter

  const nodemailer: {
    createTransport: typeof createTransport
  }
  export default nodemailer
}

