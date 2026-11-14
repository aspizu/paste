import {Page} from "./page"

export type FileAction = "create" | "edit" | "delete"

export function FilePage({
  slug,
  path,
  action,
  content = "",
  error,
}: {
  slug: string
  path: string
  action: FileAction
  content?: string
  error?: string
}) {
  const title = {create: "Create", edit: "Edit", delete: "Delete"}[action]
  const button = {create: "Publish", edit: "Save", delete: "Delete"}[action]
  return (
    <Page title={`${title} /${slug}`}>
      {error && <p role="alert">{error}</p>}
      <form method="post" action={`${path}?${action}`}>
        {action === "delete" ? (
          <p>Are you sure you want to delete this page?</p>
        ) : (
          <>
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
        <button type="submit">{button}</button>
      </form>
      <p>
        <a href={action === "create" ? "/" : path}>Cancel</a>
      </p>
    </Page>
  )
}
