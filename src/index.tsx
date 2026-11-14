import {Hono} from "hono"

import files from "./api/files"
import auth from "./auth"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import {ensureLoggedIn, isLoggedIn} from "./utils/auth"
import sql from "./utils/sql"

const app = new Hono<{Bindings: Bindings}>()

app.get("/", async (c) => {
  const loggedIn = await isLoggedIn(c)
  return c.html(
    <Page title="Paste">
      <p>
        <a href={loggedIn ? "/logout" : "/login"}>{loggedIn ? "Log out" : "Log in"}</a>
      </p>
    </Page>,
  )
})
app.route("/", auth)
app.use("/api/files/*", ensureLoggedIn)
app.route("/api/files", files)

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug")
  if (!(await isLoggedIn(c))) {
    const next = new URL(c.req.url).pathname
    return c.redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  const file = await sql(c)`
    SELECT content FROM files WHERE slug = ${slug}
  `.first<{content: string}>()
  if (!file) {
    return c.html(
      <Page title="Page not found">No page exists at this address.</Page>,
      404,
    )
  }
  return c.html(file.content)
})

export default app
