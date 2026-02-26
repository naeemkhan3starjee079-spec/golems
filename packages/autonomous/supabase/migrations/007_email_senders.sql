-- Email sender aggregation + unsubscribe tracking
CREATE TABLE IF NOT EXISTS email_senders (
  email_address text PRIMARY KEY,
  display_name text,
  domain text GENERATED ALWAYS AS (split_part(email_address, '@', 2)) STORED,
  category text DEFAULT 'normal',  -- promo, newsletter, normal, job, tech
  total_emails integer NOT NULL DEFAULT 0,
  last_email_at timestamptz,
  avg_score numeric(4,1) DEFAULT 0,
  unsubscribe_url text,
  unsubscribe_email text,         -- mailto: target from List-Unsubscribe
  unsubscribe_status text DEFAULT NULL,  -- null, requested, confirmed, failed
  user_action text DEFAULT NULL,  -- null, keep, unsubscribe, block
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on email_senders"
  ON email_senders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_email_senders_domain ON email_senders(domain);
CREATE INDEX idx_email_senders_category ON email_senders(category);
CREATE INDEX idx_email_senders_user_action ON email_senders(user_action) WHERE user_action IS NOT NULL;
CREATE INDEX idx_email_senders_total_emails ON email_senders(total_emails DESC);
