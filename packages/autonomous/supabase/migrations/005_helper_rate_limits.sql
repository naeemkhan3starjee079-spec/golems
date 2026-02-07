CREATE TABLE IF NOT EXISTS helper_rate_limits (
  backend TEXT PRIMARY KEY,
  limited BOOLEAN DEFAULT false,
  limited_at TIMESTAMPTZ,
  resets_at TIMESTAMPTZ,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE helper_rate_limits ENABLE ROW LEVEL SECURITY;

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to helper_rate_limits table
CREATE TRIGGER update_helper_rate_limits_updated_at
  BEFORE UPDATE ON helper_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
