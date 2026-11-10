
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY NOT NULL,

    title TEXT NOT NULL,

    home_team TEXT NOT NULL,

    away_team TEXT NOT NULL,

    home_logo TEXT DEFAULT '',

    away_logo TEXT DEFAULT '',

    stream_url TEXT DEFAULT '',

    match_time TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('live', 'upcoming', 'finished')),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_status
ON matches(status);

CREATE INDEX IF NOT EXISTS idx_matches_time
ON matches(match_time);

CREATE INDEX IF NOT EXISTS idx_matches_status_time
ON matches(status, match_time);
