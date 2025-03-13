-- Create a table for food cravings
CREATE TABLE food_cravings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  text TEXT NOT NULL,
  recommendation TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE food_cravings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous read access
CREATE POLICY "Allow anonymous read access"
  ON food_cravings
  FOR SELECT
  TO anon
  USING (true);

-- Create a policy that allows anonymous insert access
CREATE POLICY "Allow anonymous insert access"
  ON food_cravings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a policy that allows anonymous update access
CREATE POLICY "Allow anonymous update access"
  ON food_cravings
  FOR UPDATE
  TO anon
  USING (true); 