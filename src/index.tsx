import {Hono} from "hono"

import auth from "./auth"
import {Page} from "./components/page"
import type {Bindings} from "./env"
import files from "./files"
import {isLoggedIn} from "./utils/auth"

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
app.route("/", files)

export default app
