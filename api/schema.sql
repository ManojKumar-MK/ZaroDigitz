-- Zaro Digitz API schema (MariaDB / MySQL). Safe to run repeatedly.
--
-- Data is stored exactly like the Firestore documents it replaces: one row per document,
-- keyed by (collection, id), with the document as JSON. The website code keeps the same
-- document shapes, so migrating from Firestore (and back) is a straight copy.
-- Timestamps inside documents are {"__ts": <epoch millis>}.

CREATE TABLE IF NOT EXISTS docs (
  collection  VARCHAR(40)  NOT NULL,
  id          VARCHAR(160) NOT NULL,
  data        LONGTEXT     NOT NULL,
  deleted     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (collection, id),
  KEY idx_coll_updated (collection, updated_at)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;

-- Small key/value store for the API itself (e.g. migration status).
CREATE TABLE IF NOT EXISTS meta (
  name        VARCHAR(60)  NOT NULL PRIMARY KEY,
  value       LONGTEXT     NOT NULL,
  updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) DEFAULT CHARSET = utf8mb4;

-- Older deployments created meta.value as TEXT (64 KB); Search Console snapshots need more.
ALTER TABLE meta MODIFY value LONGTEXT NOT NULL;
