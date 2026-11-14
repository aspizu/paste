import {zValidator} from "@hono/zod-validator"
import {Hono} from "hono"
import {z} from "zod"

import sql from "../utils/sql"

interface File {
  slug: string
  content: string
  created_at: number
  updated_at: number
}

const createSchema = z.strictObject({slug: z.string(), content: z.string()})
const updateSchema = z.strictObject({content: z.string()})
const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const app = new Hono<{Bindings: {DB: D1Database}}>()

app.get("/", zValidator("query", listSchema), async (c) => {
  const {limit, offset} = c.req.valid("query")
  const {results} = await sql(c)`
    SELECT slug, content, created_at, updated_at
    FROM files
    ORDER BY created_at DESC, slug ASC
    LIMIT ${limit} OFFSET ${offset}
  `.all<File>()
  return c.json(results)
})

app.post("/", zValidator("json", createSchema), async (c) => {
  const {slug, content} = c.req.valid("json")
  const file = await sql(c)`
    INSERT INTO files (slug, content)
    VALUES (${slug}, ${content})
    ON CONFLICT (slug) DO NOTHING
    RETURNING slug, content, created_at, updated_at
  `.first<File>()
  if (!file) {
    return c.json({error: "File already exists"}, 409)
  }
  c.header("Location", `/api/files/${encodeURIComponent(file.slug)}`)
  return c.json(file, 201)
})

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const file = await sql(c)`
    SELECT slug, content, created_at, updated_at
    FROM files
    WHERE slug = ${slug}
  `.first<File>()
  if (!file) {
    return c.json({error: "File not found"}, 404)
  }
  return c.json(file)
})

app.on(["PUT", "PATCH"], "/:slug", zValidator("json", updateSchema), async (c) => {
  const slug = c.req.param("slug")
  const {content} = c.req.valid("json")
  const file = await sql(c)`
      UPDATE files
      SET content = ${content}, updated_at = unixepoch()
      WHERE slug = ${slug}
      RETURNING slug, content, created_at, updated_at
    `.first<File>()
  if (!file) {
    return c.json({error: "File not found"}, 404)
  }
  return c.json(file)
})

app.delete("/:slug", async (c) => {
  const slug = c.req.param("slug")
  const file = await sql(c)`
    DELETE FROM files
    WHERE slug = ${slug}
    RETURNING slug
  `.first<Pick<File, "slug">>()
  if (!file) {
    return c.json({error: "File not found"}, 404)
  }
  return c.body(null, 204)
})

export default app
