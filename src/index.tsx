import {Hono} from "hono"

import auth from "./auth"
import type {Bindings} from "./env"
import files from "./files"

const app = new Hono<{Bindings: Bindings}>()

app.route("/", auth)
app.route("/", files)

export default app
