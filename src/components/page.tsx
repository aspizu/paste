import {html} from "hono/html"
import type {Child} from "hono/jsx"

export function Page({title, children}: {title: string; children: Child}) {
  return html`<!doctype html>${(
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title} · Paste</title>
        </head>
        <body>
          <main>
            <h1>{title}</h1>
            {children}
          </main>
        </body>
      </html>
    )}`
}
