import {Hono} from "hono"

const app = new Hono()

app.get("/", (c) => c.text("Paste\n"))

export default app
