import {Hono, type Context} from "hono"

import {FilePage, type FileAction} from "./components/file-page"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import {ensureLoggedIn} from "./utils/auth"
import sql from "./utils/sql"

const app = new Hono<{Bindings: Bindings}>()

async function _renderFile(
  c: Context<{Bindings: Bindings}>,
  slug: string,
  file: {content: string; content_type: string},
) {
  let content = file.content
  if (
    /^text\/html(?:\s*;|$)/i.test(file.content_type) &&
    slug !== "before.html" &&
    slug !== "after.html"
  ) {
    const {results} = await sql(c)`
      SELECT slug, content FROM files WHERE slug IN ('before.html', 'after.html')
    `.all<{slug: string; content: string}>()
    const before =
      results.find((fragment) => fragment.slug === "before.html")?.content ?? ""
    const after =
      results.find((fragment) => fragment.slug === "after.html")?.content ?? ""
    content = before + content + after
  }
  return c.body(content, 200, {"Content-Type": file.content_type})
}

app.on(["GET", "POST"], ["/", "/:slug{.+}"], async (c) => {
  if (c.req.method === "POST") {
    await ensureLoggedIn(c)
  }
  const slug = c.req.param("slug") ?? ""
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
      SELECT content, content_type FROM files WHERE slug = ${slug}
    `.first<{content: string; content_type: string}>()
    if (!file) {
      return c.html(
        <Page title="Page not found">No page exists at this address.</Page>,
        404,
      )
    }
    if (action) {
      return c.html(
        <FilePage
          slug={slug}
          path={path}
          action={action}
          content={file.content}
          contentType={file.content_type}
        />,
      )
    }
    return _renderFile(c, slug, file)
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

  const {content, content_type = "text/html; charset=UTF-8"} = await c.req.parseBody()
  const contentType = typeof content_type === "string" ? content_type.trim() : ""
  if (typeof content !== "string") {
    return c.html(
      <FilePage
        slug={slug}
        path={path}
        action={action}
        contentType={contentType}
        error="Content must be text."
      />,
      400,
    )
  }

  if (
    !/^[\w!#$%&'*+.^`|~-]+\/[\w!#$%&'*+.^`|~-]+(?:[ \t]*;[\t\x20-\x7e]*)?$/.test(
      contentType,
    )
  ) {
    return c.html(
      <FilePage
        slug={slug}
        path={path}
        action={action}
        content={content}
        contentType={contentType}
        error="Enter a valid content type."
      />,
      400,
    )
  }

  if (action === "create") {
    const file = await sql(c)`
      INSERT INTO files (slug, content, content_type)
      VALUES (${slug}, ${content}, ${contentType})
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
          contentType={contentType}
          error="A page already exists at this address."
        />,
        409,
      )
    }
    return c.redirect(path, 303)
  }

  const file = await sql(c)`
    UPDATE files
    SET content = ${content}, content_type = ${contentType}, updated_at = unixepoch()
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
