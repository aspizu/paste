import {html} from "hono/html"
import type {Child} from "hono/jsx"

export function Page({title, children}: {title: string; children: Child}) {
  return html`<!doctype html>${(
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title} · Paste</title>
          <meta
            name="htmx-config"
            content={JSON.stringify({
              responseHandling: [
                {code: "204", swap: false},
                {code: "[23]..", swap: true},
                {code: "[45]..", swap: true, error: true},
                {code: "...", swap: false},
              ],
            })}
          />
          <script
            src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.11/dist/htmx.min.js"
            integrity="sha384-2OatzQy1H+Zd/IIrjr1TcuDGqLXeHhbooAyJY1KdQMKnr4LZ22k31GBLdYKHmVjg"
            crossorigin="anonymous"
            defer
          />
        </head>
        <body
          hx-boost="true"
          hx-history="false"
          hx-disabled-elt="find button[type='submit']"
        >
          <main>
            <h1>{title}</h1>
            {children}
          </main>
        </body>
      </html>
    )}`
}
