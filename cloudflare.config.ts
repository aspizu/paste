import {bindings, defineConfig} from "cf/config"

export default defineConfig({
  worker: {
    name: "paste",
    compatibilityDate: "2026-09-02",
    entrypoint: "./src/index.tsx",
    domains: ["paste.aspiz.uk"],
    env: {
      DB: bindings.d1({name: "paste", id: "f2cb9e57-5a24-47a4-9dc3-7c5599f06e35"}),
      TOTP_SECRET: bindings.secret(),
      JWT_SECRET: bindings.secret(),
      RATELIMIT: bindings.rateLimit({
        namespace: "001",
        simple: {limit: 10, period: 60},
      }),
    },
  },
})
