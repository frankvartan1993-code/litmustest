CREATE TABLE IF NOT EXISTS submissions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_name   TEXT,
  score           INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  bytes_before    INTEGER NOT NULL,
  bytes_after     INTEGER NOT NULL,
  macros_before   TEXT[] NOT NULL DEFAULT '{}',
  macros_intact   BOOLEAN NOT NULL,
  issues_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixes_applied   JSONB NOT NULL DEFAULT '[]'::jsonb,
  hard_fail       BOOLEAN NOT NULL DEFAULT false,
  duration_ms     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
