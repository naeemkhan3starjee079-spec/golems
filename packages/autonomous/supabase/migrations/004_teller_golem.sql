-- 004: TellerGolem - Add tax categorization to payments
-- Adds IRS Schedule C tax category for expense tracking

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS tax_category TEXT;

-- Index for tax report queries
CREATE INDEX IF NOT EXISTS idx_payments_tax_category ON payments(tax_category);

-- Index for monthly report queries
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

COMMENT ON COLUMN payments.tax_category IS 'IRS Schedule C category: advertising, insurance, office, software, education, travel, meals, professional-services, other';
