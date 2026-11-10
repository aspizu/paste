import {defineConfig} from "oxfmt"

export default defineConfig({
  semi: false,
  tabWidth: 2,
  bracketSpacing: false,
  printWidth: 88,
  endOfLine: "lf",
  sortImports: true,
  sortPackageJson: false,
  ignorePatterns: ["pnpm-lock.yaml"],
})
