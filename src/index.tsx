import {Hono} from "hono"

import auth from "./auth"
import type {Bindings} from "./env"
import files from "./files"

const app = new Hono<{Bindings: Bindings}>()

app.use(async (c, next) => {
  await next()
  const location = c.res.headers.get("Location")
  if (
    c.req.header("HX-Request") === "true" &&
    c.res.status >= 300 &&
    c.res.status < 400 &&
    location
  ) {
    c.header("HX-Redirect", location)
    c.header("Location", undefined)
    c.res = c.body(null, 200)
  }
})

app.route("/", auth)
app.route("/", files)

export default app
