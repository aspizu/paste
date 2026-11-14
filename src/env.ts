export interface Bindings {
  DB: D1Database
  TOTP_SECRET: string
  JWT_SECRET: string
  RATELIMIT: RateLimit
}
