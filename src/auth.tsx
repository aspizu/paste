import {zValidator} from "@hono/zod-validator"
import {base32} from "@otplib/plugin-base32-scure"
import {crypto} from "@otplib/plugin-crypto-web"
import {Hono} from "hono"
import {deleteCookie, setSignedCookie} from "hono/cookie"
import {createMiddleware} from "hono/factory"
import {TOTP} from "otplib"
import {z} from "zod"

import {LoginPage} from "./components/login-page"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import {isLoggedIn} from "./utils/auth"

const sessionMaxAge = 7 * 24 * 60 * 60

function _redirectTo(next: unknown, requestUrl: string) {
  if (typeof next !== "string" || !next.startsWith("/")) {
    return "/"
  }
  try {
    const origin = new URL(requestUrl).origin
    const target = new URL(next, origin)
    if (
      target.origin === origin &&
      target.pathname !== "/login" &&
      target.pathname !== "/logout"
    ) {
      return `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    return "/"
  }
  return "/"
}

const authMiddleware = createMiddleware<{Bindings: Bindings}>(async (c, next) => {
  const {success} = await c.env.RATELIMIT.limit({
    key: JSON.stringify({ip: "global", pathname: c.req.path}),
  })
  if (!success) {
    return c.html(
      <Page title="Too many requests">
        <p>Rate limit exceeded. Try again shortly.</p>
      </Page>,
      429,
    )
  }
  return next()
})

export default new Hono<{Bindings: Bindings}>()
  .use("/login", authMiddleware)
  .use("/logout", authMiddleware)
  .get("/login", async (c) => {
    const next = _redirectTo(c.req.query("next"), c.req.url)
    if (await isLoggedIn(c)) {
      return c.redirect(next)
    }
    return c.html(<LoginPage next={next} />)
  })
  .post(
    "/login",
    zValidator(
      "form",
      z.object({totp: z.string().regex(/^[0-9]{6}$/), next: z.string().optional()}),
      (result, c) => {
        if (!result.success) {
          return c.html(
            <LoginPage
              next={_redirectTo(result.data.next, c.req.url)}
              error="Enter a six-digit authenticator code."
            />,
            400,
          )
        }
        return undefined
      },
    ),
    async (c) => {
      const {totp, next} = c.req.valid("form")
      const result = await new TOTP({secret: c.env.TOTP_SECRET, crypto, base32}).verify(
        totp,
      )
      if (!result.valid) {
        return c.html(
          <LoginPage
            next={_redirectTo(next, c.req.url)}
            error="Invalid authenticator code. Try again."
          />,
          400,
        )
      }
      await setSignedCookie(
        c,
        "session",
        new Date(Date.now() + sessionMaxAge * 1000).toISOString(),
        c.env.JWT_SECRET,
        {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: sessionMaxAge,
          secure: true,
        },
      )
      return c.redirect(_redirectTo(next, c.req.url), 303)
    },
  )
  .get("/logout", async (c) => {
    if (!(await isLoggedIn(c))) {
      return c.redirect("/login")
    }
    return c.html(
      <Page title="Log out">
        <form method="post" action="/logout">
          <button type="submit">Log out</button>
        </form>
        <p>
          <a href="/">Cancel</a>
        </p>
      </Page>,
    )
  })
  .post("/logout", (c) => {
    deleteCookie(c, "session", {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    })
    return c.redirect("/login", 303)
  })
