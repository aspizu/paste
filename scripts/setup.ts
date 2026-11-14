#!/usr/bin/env node
import {spawnSync} from "node:child_process"
import {randomBytes} from "node:crypto"
import {mkdtemp, open, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join, resolve} from "node:path"
import {fileURLToPath, URL} from "node:url"
import {parseArgs, parseEnv} from "node:util"

import {generateSecret, generateURI} from "otplib"
import QRCode from "qrcode"

import config from "../cloudflare.config.ts"

async function _main(): Promise<void> {
  const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: {
      file: {
        type: "string",
        default: fileURLToPath(new URL("../.dev.vars", import.meta.url)),
      },
      help: {type: "boolean", short: "h"},
    },
  })
  if (values.help) {
    console.log("Usage: pnpm run setup [totp|env] [--file PATH]")
    console.log(
      "Runs both steps by default. Use totp for local setup or env to upload later.",
    )
    return
  }
  const step = positionals[0]
  if (
    positionals.length > 1 ||
    (step !== undefined && step !== "totp" && step !== "env")
  ) {
    throw new Error("Choose totp or env, or omit the step to run both.")
  }
  const envPath = resolve(values.file)
  if (step !== "env") {
    await _setupTotp(envPath, config.worker.domains[0] ?? config.worker.name)
  }
  if (step !== "totp") {
    await _uploadEnv(envPath)
  }
}

async function _setupTotp(envPath: string, label: string): Promise<void> {
  console.log("Step 1: Set up authenticator login")
  const file = await open(envPath, "a+", 0o600)
  try {
    const contents = await file.readFile("utf8")
    const existing = parseEnv(contents)
    for (const key of ["TOTP_SECRET", "JWT_SECRET"]) {
      if (key in existing && !existing[key]?.trim()) {
        throw new Error(
          `${key} is empty. Remove its entry from ${envPath} and run this script again.`,
        )
      }
    }
    const totpSecret = existing.TOTP_SECRET ?? generateSecret()
    const jwtSecret = existing.JWT_SECRET ?? randomBytes(32).toString("hex")
    if (!/^[A-Z2-7]+=*$/i.test(totpSecret)) {
      throw new Error("Existing TOTP_SECRET must be a Base32 authenticator setup key.")
    }
    const uri = generateURI({
      issuer: config.worker.name,
      label,
      secret: totpSecret,
      algorithm: "sha1",
      digits: 6,
      period: 30,
    })
    const qr = await QRCode.toString(uri, {type: "terminal", small: true})
    const generated = Object.entries({
      TOTP_SECRET: totpSecret,
      JWT_SECRET: jwtSecret,
    }).filter(([key]) => !(key in existing))
    await file.chmod(0o600)
    if (generated.length) {
      const newline = contents.includes("\r\n") ? "\r\n" : "\n"
      const separator = contents && !contents.endsWith("\n") ? newline : ""
      await file.writeFile(
        separator +
          generated.map(([key, value]) => `${key}=${value}${newline}`).join(""),
      )
    }
    console.log(`Secrets saved in ${envPath}. Existing values were preserved.`)
    console.log(`Authenticator account: ${label}`)
    console.log("In your authenticator app, add an account and scan this QR code:")
    console.log(qr)
    console.log(`Manual setup key: ${totpSecret}`)
    console.log(`Keep this QR code and ${envPath} private.`)
  } finally {
    await file.close()
  }
}

async function _uploadEnv(envPath: string): Promise<void> {
  console.log("Step 2: Upload secrets to your Cloudflare Worker")
  const existing = parseEnv(await readFile(envPath, "utf8"))
  const secrets: Record<string, {type: "secret_text"; text: string}> = {}
  for (const key of ["TOTP_SECRET", "JWT_SECRET"]) {
    const value = existing[key]
    if (!value?.trim()) {
      throw new Error(`Missing ${key}. Run the totp step first.`)
    }
    secrets[key] = {type: "secret_text", text: value}
  }
  const directory = await mkdtemp(join(tmpdir(), "paste-secrets-"))
  try {
    const path = join(directory, "secrets.json")
    await writeFile(path, JSON.stringify(secrets), {mode: 0o600})
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("bin/cf", import.meta.resolve("cf/package.json"))),
        "workers",
        "secrets",
        "bulk",
        "--worker",
        config.worker.name,
        "--secrets",
        `@${path}`,
      ],
      {cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "inherit"},
    )
    if (result.error || result.status !== 0) {
      throw new Error(
        "Upload failed. Your secrets are saved locally; run the env step to retry.",
      )
    }
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
  console.log("Secret upload complete.")
}

_main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
