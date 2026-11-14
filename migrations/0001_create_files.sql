CREATE TABLE files (
    slug TEXT PRIMARY KEY NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT, WITHOUT ROWID;
