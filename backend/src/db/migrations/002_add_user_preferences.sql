-- Up
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  default_format TEXT NOT NULL DEFAULT 'json',
  include_raw_matches INTEGER NOT NULL DEFAULT 1,
  confidence_threshold REAL NOT NULL DEFAULT 65.0,
  theme TEXT NOT NULL DEFAULT 'light'
);

-- Down
DROP TABLE IF EXISTS user_preferences;
