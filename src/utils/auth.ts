import type {Context} from "hono"
import {getSignedCookie} from "hono/cookie"
import {HTTPException} from "hono/http-exception"

import type {Bindings} from "../env"

export async function isLoggedIn(c: Context<{Bindings: Bindings}>) {
  const cookie = await getSignedCookie(c, c.env.JWT_SECRET, "session")
  if (!cookie || !cookie.trim()) {
    return false
  }
  const expiry = new Date(cookie).getTime()
  return Number.isFinite(expiry) && Date.now() < expiry
}

export async function ensureLoggedIn(c: Context<{Bindings: Bindings}>) {
  if (!(await isLoggedIn(c))) {
    const url = new URL(c.req.url)
    throw new HTTPException(302, {
      res: c.redirect(`/login?next=${encodeURIComponent(url.pathname + url.search)}`),
    })
  }
}
