import {Page} from "./page"

export type FileAction = "create" | "edit" | "delete"

const contentTypes = [
  ["Plain text", "text/plain; charset=UTF-8"],
  ["HTML", "text/html; charset=UTF-8"],
  ["CSS", "text/css; charset=UTF-8"],
  ["JavaScript", "text/javascript; charset=UTF-8"],
  ["JSON", "application/json"],
  ["XML", "application/xml; charset=UTF-8"],
  ["Markdown", "text/markdown; charset=UTF-8"],
  ["CSV", "text/csv; charset=UTF-8"],
  ["TSV", "text/tab-separated-values; charset=UTF-8"],
  ["YAML", "application/yaml; charset=UTF-8"],
  ["SVG", "image/svg+xml; charset=UTF-8"],
]

export function FilePage({
  slug,
  path,
  action,
  content = "",
  contentType = "text/html; charset=UTF-8",
  error,
}: {
  slug: string
  path: string
  action: FileAction
  content?: string
  contentType?: string
  error?: string
}) {
  const title = {create: "Create", edit: "Edit", delete: "Delete"}[action]
  const button = {create: "Publish", edit: "Save", delete: "Delete"}[action]
  const progress = {create: "Publishing…", edit: "Saving…", delete: "Deleting…"}[action]
  return (
    <Page title={`${title} /${slug}`}>
      {error && <p role="alert">{error}</p>}
      <form method="post" action={`${path}?${action}`}>
        {action === "delete" ? (
          <p>Are you sure you want to delete this page?</p>
        ) : (
          <>
            <p>
              <label for="content-type">Content type</label>
            </p>
            <p>
              <select id="content-type" name="content_type" required>
                {!contentTypes.some(([, value]) => value === contentType) && (
                  <option value={contentType} selected>
                    {contentType}
                  </option>
                )}
                {contentTypes.map(([label, value]) => (
                  <option value={value} selected={value === contentType}>
                    {label}
                  </option>
                ))}
              </select>
            </p>
            <p>
              <label for="content">Content</label>
            </p>
            <p>
              <textarea id="content" name="content" rows={24} cols={80} autofocus>
                {`\n${content}`}
              </textarea>
            </p>
          </>
        )}
        <button type="submit">{button}</button>{" "}
        <span class="htmx-indicator" role="status">
          {progress}
        </span>
      </form>
      <p>
        <a href={action === "create" ? "/" : path} hx-boost="false">
          Cancel
        </a>
      </p>
    </Page>
  )
}
