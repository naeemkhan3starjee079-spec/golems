CREATE TABLE IF NOT EXISTS helper_rate_limits (
  backend TEXT PRIMARY KEY,
  limited BOOLEAN DEFAULT false,
  limited_at TIMESTAMPTZ,
  resets_at TIMESTAMPTZ,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE helper_rate_limits ENABLE ROW LEVEL SECURITY;
