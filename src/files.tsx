import {Hono, type Context} from "hono"

import {FilePage, type FileAction} from "./components/file-page"
import {HomePage} from "./components/home-page"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import {ensureLoggedIn, isLoggedIn} from "./utils/auth"
import sql from "./utils/sql"

const app = new Hono<{Bindings: Bindings}>()
const pageSize = 25

app.get("/", async (c) => {
  const requestedPage = c.req.query("page") ?? "1"
  const page = Number(requestedPage)
  const offset = (page - 1) * pageSize
  if (!/^[1-9]\d*$/.test(requestedPage) || !Number.isSafeInteger(offset)) {
    return c.redirect("/")
  }

  const {results} = await sql(c)`
    SELECT slug FROM files WHERE slug <> '' ORDER BY slug LIMIT ${pageSize + 1} OFFSET ${offset}
  `.all<{slug: string}>()
  if (page > 1 && results.length === 0) {
    return c.redirect("/")
  }

  return c.html(
    <HomePage
      slugs={results.slice(0, pageSize).map(({slug}) => slug)}
      page={page}
      hasNextPage={results.length > pageSize}
    />,
  )
})

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

function _renderMissingFile(
  c: Context<{Bindings: Bindings}>,
  path: string,
  canCreate: boolean,
) {
  return c.html(
    <Page title="Page not found">
      <p>No page exists at this address.</p>
      {canCreate && (
        <p>
          <a href={`${path}?create`}>Create page</a>
        </p>
      )}
    </Page>,
    404,
    {"Cache-Control": "private, no-store"},
  )
}

function _confirmInPlaceSave(c: Context<{Bindings: Bindings}>, path: string) {
  if (c.req.header("HX-Request") === "true") {
    return c.html(
      <span id="save-status" hx-swap-oob="innerHTML">
        Saved.
      </span>,
      200,
      {"HX-Reswap": "none show:none"},
    )
  }
  return c.redirect(`${path}?edit&saved`, 303)
}

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

  if (c.req.method === "GET") {
    const file = await sql(c)`
      SELECT content, content_type FROM files WHERE slug = ${slug}
    `.first<{content: string; content_type: string}>()
    if (action === "create") {
      if (file) {
        return c.redirect(`${path}?edit`)
      }
      return c.html(<FilePage slug={slug} path={path} action={action} />)
    }
    if (!file) {
      return _renderMissingFile(c, path, await isLoggedIn(c))
    }
    if (action) {
      return c.html(
        <FilePage
          slug={slug}
          path={path}
          action={action}
          content={file.content}
          contentType={file.content_type}
          saved={c.req.query("saved") !== undefined}
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
      return _renderMissingFile(c, path, true)
    }
    return c.redirect("/", 303)
  }

  const {
    content,
    content_type = "text/html; charset=UTF-8",
    save_in_place,
  } = await c.req.parseBody()
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
      return c.redirect(`${path}?edit`, 303)
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
    return _renderMissingFile(c, path, true)
  }
  if (save_in_place === "1") {
    return _confirmInPlaceSave(c, path)
  }
  return c.redirect(path, 303)
})

export default app
