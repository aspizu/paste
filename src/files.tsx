import {Hono} from "hono"

import {FilePage, type FileAction} from "./components/file-page"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import {ensureLoggedIn} from "./utils/auth"
import sql from "./utils/sql"

const app = new Hono<{Bindings: Bindings}>()

app.on(["GET", "POST"], "/:slug{.+}", async (c) => {
  if (c.req.method === "POST") {
    await ensureLoggedIn(c)
  }
  const slug = c.req.param("slug")
  const path = new URL(c.req.url).pathname.replace(/^\/\//, "/%2F")
  const actions = (["create", "edit", "delete"] as const).filter(
    (action) => c.req.query(action) !== undefined,
  )
  const action: FileAction | undefined = actions[0]
  if (actions.length > 1 || (c.req.method === "POST" && !action)) {
    return c.html(
      <Page title="Invalid action">Choose one of create, edit, or delete.</Page>,
      400,
    )
  }

  if (c.req.method === "GET" && action === "create") {
    return c.html(<FilePage slug={slug} path={path} action={action} />)
  }

  if (c.req.method === "GET") {
    const file = await sql(c)`
      SELECT content FROM files WHERE slug = ${slug}
    `.first<{content: string}>()
    if (!file) {
      return c.html(
        <Page title="Page not found">No page exists at this address.</Page>,
        404,
      )
    }
    if (action) {
      return c.html(
        <FilePage slug={slug} path={path} action={action} content={file.content} />,
      )
    }
    return c.html(file.content)
  }

  if (action === "delete") {
    const file = await sql(c)`
      DELETE FROM files WHERE slug = ${slug} RETURNING slug
    `.first<{slug: string}>()
    if (!file) {
      return c.html(
        <Page title="Page not found">No page exists at this address.</Page>,
        404,
      )
    }
    return c.redirect("/", 303)
  }

  const {content} = await c.req.parseBody()
  if (typeof content !== "string") {
    return c.html(
      <FilePage
        slug={slug}
        path={path}
        action={action}
        error="Content must be text."
      />,
      400,
    )
  }

  if (action === "create") {
    const file = await sql(c)`
      INSERT INTO files (slug, content)
      VALUES (${slug}, ${content})
      ON CONFLICT (slug) DO NOTHING
      RETURNING slug
    `.first<{slug: string}>()
    if (!file) {
      return c.html(
        <FilePage
          slug={slug}
          path={path}
          action={action}
          content={content}
          error="A page already exists at this address."
        />,
        409,
      )
    }
    return c.redirect(path, 303)
  }

  const file = await sql(c)`
    UPDATE files
    SET content = ${content}, updated_at = unixepoch()
    WHERE slug = ${slug}
    RETURNING slug
  `.first<{slug: string}>()
  if (!file) {
    return c.html(
      <Page title="Page not found">No page exists at this address.</Page>,
      404,
    )
  }
  return c.redirect(path, 303)
})

export default app
