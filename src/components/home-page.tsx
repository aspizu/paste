import {Page} from "./page"

function _fileHref(slug: string) {
  const segments = slug.split("/")
  if (slug.startsWith("/") || segments.some((part) => part === "." || part === "..")) {
    return `/${encodeURIComponent(slug)}`
  }
  return `/${segments.map(encodeURIComponent).join("/")}`
}

export function HomePage({
  slugs,
  page,
  hasNextPage,
}: {
  slugs: string[]
  page: number
  hasNextPage: boolean
}) {
  return (
    <Page title="Pages">
      {slugs.length === 0 ? (
        <p>No pages yet.</p>
      ) : (
        <ul>
          {slugs.map((slug) => (
            <li>
              <a href={_fileHref(slug)} hx-boost="false">
                /{slug}
              </a>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || hasNextPage) && (
        <nav aria-label="Pagination">
          {page > 1 && (
            <>
              <a href={page === 2 ? "/" : `/?page=${page - 1}`} rel="prev">
                Previous
              </a>{" "}
            </>
          )}
          <span>Page {page}</span>
          {hasNextPage && (
            <>
              {" "}
              <a href={`/?page=${page + 1}`} rel="next">
                Next
              </a>
            </>
          )}
        </nav>
      )}
    </Page>
  )
}
