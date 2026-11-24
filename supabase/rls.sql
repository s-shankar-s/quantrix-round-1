-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & FUNCTIONS
-- ====================================================================

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_purchase_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_willingness_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_timer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Customer profiles: Public can read, but indicative_wtp is omitted by views or server-side filtering
CREATE OR REPLACE VIEW team_visible_profiles AS 
SELECT id, customer_profile, age_range, budget_income_context, primary_purchase_factor, other_preferences, preferred_product, purchase_channel 
FROM customer_profiles;

-- 2. Allow read on survey data for all
CREATE POLICY "Allow public read on survey_purchase_factors" ON survey_purchase_factors FOR SELECT USING (true);
CREATE POLICY "Allow public read on survey_willingness_to_pay" ON survey_willingness_to_pay FOR SELECT USING (true);
CREATE POLICY "Allow read on round_timer_state" ON round_timer_state FOR SELECT USING (true);
CREATE POLICY "Allow read on evaluation_config" ON evaluation_config FOR SELECT USING (true);

-- Realtime publication setup
ALTER PUBLICATION supabase_realtime ADD TABLE round_timer_state;
ALTER PUBLICATION supabase_realtime ADD TABLE team_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE evaluation_config;
ALTER PUBLICATION supabase_realtime ADD TABLE judge_evaluations;
