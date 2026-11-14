import type {Context} from "hono"
import {getSignedCookie} from "hono/cookie"
import {createMiddleware} from "hono/factory"

import type {Bindings} from "../env"

export async function isLoggedIn(c: Context<{Bindings: Bindings}>) {
  const cookie = await getSignedCookie(c, c.env.JWT_SECRET, "session")
  if (!cookie || !cookie.trim()) {
    return false
  }
  const expiry = new Date(cookie).getTime()
  return Number.isFinite(expiry) && Date.now() < expiry
}

export const ensureLoggedIn = createMiddleware<{Bindings: Bindings}>(
  async (c, next) => {
    if (!(await isLoggedIn(c))) {
      return c.redirect("/login")
    }
    return next()
  },
)
