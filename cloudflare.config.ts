import {defineConfig} from "cf/config"

export default defineConfig({
  worker: {
    name: "paste",
    compatibilityDate: "2026-09-02",
    entrypoint: "./src/index.ts",
    domains: ["paste.aspiz.uk"],
  },
})
