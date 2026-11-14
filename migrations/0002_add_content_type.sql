ALTER TABLE files
ADD COLUMN content_type TEXT NOT NULL DEFAULT 'text/html; charset=UTF-8';
