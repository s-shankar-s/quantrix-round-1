-- ====================================================================
-- QUANTRIX – THE PRICE IS RIGHT? (ROUND 1: KNOW YOUR CUSTOMER)
-- PRODUCTION SUPABASE / POSTGRESQL SCHEMA & SEED DATA
-- Thiagarajar School of Management, Madurai
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'team', 'judge');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE round_timer_status AS ENUM ('not_started', 'running', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status_type AS ENUM (
        'not_started', 
        'draft_in_progress', 
        'submitted', 
        'auto_submitted_at_expiry', 
        'revision_in_progress', 
        'revised_and_resubmitted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scoring_mode_type AS ENUM ('panel_common', 'individual_average');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ACCOUNTS / USERS TABLE
-- Handles authenticated credentials for Admin, Teams and Judges
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY, -- e.g. 'admin_01', 'team_01'..'team_15', 'judge_01'
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CUSTOMER PROFILES TABLE
-- 15 exact profiles. Critical: indicative_wtp is confidential and never sent to teams.
CREATE TABLE IF NOT EXISTS customer_profiles (
    id INT PRIMARY KEY,
    customer_profile TEXT NOT NULL,
    age_range TEXT NOT NULL,
    budget_income_context TEXT NOT NULL,
    primary_purchase_factor TEXT NOT NULL,
    other_preferences TEXT NOT NULL,
    preferred_product TEXT NOT NULL,
    purchase_channel TEXT NOT NULL,
    indicative_wtp TEXT NOT NULL, -- Organiser/Judge benchmark reference ONLY
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. SURVEY DATA TABLES (Market survey of 100 potential customers)
CREATE TABLE IF NOT EXISTS survey_purchase_factors (
    id SERIAL PRIMARY KEY,
    factor TEXT NOT NULL,
    customer_count INT NOT NULL,
    percentage INT NOT NULL
);

CREATE TABLE IF NOT EXISTS survey_willingness_to_pay (
    id SERIAL PRIMARY KEY,
    price_range TEXT NOT NULL,
    customer_count INT NOT NULL,
    percentage INT NOT NULL
);

-- 5. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    team_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    team_number INT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    assigned_profile_id INT NOT NULL REFERENCES customer_profiles(id),
    login_status TEXT NOT NULL DEFAULT 'offline', -- 'online', 'offline'
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. JUDGES TABLE
CREATE TABLE IF NOT EXISTS judges (
    judge_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    is_lead BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. EVENT & CENTRAL REALTIME TIMER STATE (Single Row: id = 1)
CREATE TABLE IF NOT EXISTS round_timer_state (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    status round_timer_status NOT NULL DEFAULT 'not_started',
    duration_seconds INT NOT NULL DEFAULT 720, -- 12 minutes
    started_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    remaining_seconds_on_pause INT NOT NULL DEFAULT 720,
    server_time_reference TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- 8. TEAM SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS team_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT UNIQUE NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    q1_target_customer TEXT DEFAULT '',
    q2_factor_1 TEXT DEFAULT '',
    q2_factor_2 TEXT DEFAULT '',
    q2_factor_3 TEXT DEFAULT '',
    q3_survey_top_price_range TEXT DEFAULT '',
    q4_recommended_price NUMERIC,
    q5_price_justification TEXT DEFAULT '',
    status submission_status_type NOT NULL DEFAULT 'not_started',
    is_auto_submitted BOOLEAN NOT NULL DEFAULT false,
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    edit_permitted BOOLEAN NOT NULL DEFAULT false,
    edit_approved_by TEXT,
    edit_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. SUBMISSION REVISIONS (Audit history of organiser-approved edits)
CREATE TABLE IF NOT EXISTS submission_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    previous_q1 TEXT,
    previous_q2_f1 TEXT,
    previous_q2_f2 TEXT,
    previous_q2_f3 TEXT,
    previous_q3 TEXT,
    previous_q4 NUMERIC,
    previous_q5 TEXT,
    previous_submitted_at TIMESTAMPTZ,
    approved_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. EVALUATION CONFIGURATION (Single Row: id = 1)
CREATE TABLE IF NOT EXISTS evaluation_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_open BOOLEAN NOT NULL DEFAULT false,
    scheduled_open_at TIMESTAMPTZ,
    scheduled_close_at TIMESTAMPTZ,
    scoring_mode scoring_mode_type NOT NULL DEFAULT 'panel_common',
    lead_judge_id TEXT REFERENCES judges(judge_id),
    results_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    published_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. JUDGE EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS judge_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL REFERENCES judges(judge_id) ON DELETE CASCADE,
    -- Rubric: 100 marks total
    criterion_1_identification NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (criterion_1_identification BETWEEN 0 AND 20),
    criterion_2_survey NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (criterion_2_survey BETWEEN 0 AND 30),
    criterion_3_price NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (criterion_3_price BETWEEN 0 AND 30),
    criterion_4_justification NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (criterion_4_justification BETWEEN 0 AND 20),
    total_score NUMERIC(5,2) GENERATED ALWAYS AS (
        criterion_1_identification + criterion_2_survey + criterion_3_price + criterion_4_justification
    ) STORED,
    strengths TEXT DEFAULT '',
    areas_for_improvement TEXT DEFAULT '',
    general_comments TEXT DEFAULT '',
    is_final BOOLEAN NOT NULL DEFAULT false,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(team_id, judge_id)
);

-- 12. INTEGRITY MONITORING EVENTS TABLE
CREATE TABLE IF NOT EXISTS integrity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'tab_switch', 'window_blur', 'copy_attempt', 'paste_attempt', 'context_menu'
    details TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- Seed Customer Profiles (15 exact profiles)
INSERT INTO customer_profiles (id, customer_profile, age_range, budget_income_context, primary_purchase_factor, other_preferences, preferred_product, purchase_channel, indicative_wtp)
VALUES
(1, 'Budget-conscious college student', '18–22', '₹2,500–₹4,000', 'Affordable price', 'Basic leak-proof durability', '750 ml steel bottle', 'Online marketplaces', '₹200–₹249'),
(2, 'Style-focused college student', '18–24', '₹3,000–₹6,000', 'Attractive design', 'Colours and portability', '750 ml steel bottle', 'Campus stores / online', '₹250–₹299'),
(3, 'Eco-conscious student', '18–25', '₹3,000–₹5,000', 'Eco-friendly materials', 'Sustainability and durability', '750 ml steel bottle', 'Online / eco stores', '₹250–₹299'),
(4, 'Sports and fitness student', '18–25', '₹4,000–₹7,000', 'Durability and capacity', 'Easy carry and hydration', '1 litre bottle', 'Sports stores / online', '₹300–₹349'),
(5, 'Commuting young professional', '22–28', '₹15,000–₹30,000', 'Convenience', 'Leak-proof and easy to clean', '750 ml steel bottle', 'Online / retail', '₹300–₹349'),
(6, 'Office employee', '25–35', '₹20,000–₹45,000', 'Quality', 'Insulation and professional design', '750 ml insulated bottle', 'Retail / online', '₹350 and above'),
(7, 'Value-seeking parent', '30–45', '₹25,000–₹60,000 household', 'Price and safety', 'Durable, easy to clean', '750 ml steel bottle', 'Retail stores', '₹250–₹299'),
(8, 'Outdoor traveller', '20–35', '₹10,000–₹35,000', 'Durability', 'Rugged design and capacity', '1 litre bottle', 'Outdoor stores / online', '₹300–₹349'),
(9, 'Premium lifestyle buyer', '25–40', '₹40,000–₹1,00,000', 'Design and brand', 'Premium finish and insulation', '750 ml premium bottle', 'Brand website / premium retail', '₹350 and above'),
(10, 'Frequent gym-goer', '18–30', '₹5,000–₹20,000', 'Functionality', 'Large capacity and easy grip', '1 litre bottle', 'Sports stores / online', '₹300–₹349'),
(11, 'School/college commuter', '16–22', '₹2,000–₹5,000', 'Affordability', 'Lightweight and leak-proof', '600–750 ml bottle', 'Retail / online', '₹200–₹249'),
(12, 'Tech-oriented buyer', '20–35', '₹15,000–₹50,000', 'Innovative features', 'Temperature display / smart features', 'Smart insulated bottle', 'Online / tech retail', '₹350 and above'),
(13, 'Minimalist buyer', '22–35', '₹15,000–₹40,000', 'Simple design', 'Easy cleaning and practical use', '750 ml bottle', 'Online', '₹250–₹299'),
(14, 'Health-conscious office worker', '25–40', '₹25,000–₹60,000', 'Convenience and quality', 'Temperature retention', '750 ml insulated bottle', 'Online / retail', '₹300–₹349'),
(15, 'Gift shopper', '20–45', '₹10,000–₹50,000', 'Appearance and perceived value', 'Packaging and attractive design', '750 ml premium bottle', 'Gift stores / online', '₹300–₹349')
ON CONFLICT (id) DO UPDATE SET 
    customer_profile = EXCLUDED.customer_profile,
    age_range = EXCLUDED.age_range,
    budget_income_context = EXCLUDED.budget_income_context,
    primary_purchase_factor = EXCLUDED.primary_purchase_factor,
    other_preferences = EXCLUDED.other_preferences,
    preferred_product = EXCLUDED.preferred_product,
    purchase_channel = EXCLUDED.purchase_channel,
    indicative_wtp = EXCLUDED.indicative_wtp;

-- Seed Purchase Factors Survey Data
TRUNCATE TABLE survey_purchase_factors RESTART IDENTITY CASCADE;
INSERT INTO survey_purchase_factors (factor, customer_count, percentage) VALUES
('Affordable price', 35, 35),
('Product quality', 25, 25),
('Attractive design', 18, 18),
('Brand reputation', 12, 12),
('Eco-friendly material', 10, 10);

-- Seed Willingness to Pay Survey Data
TRUNCATE TABLE survey_willingness_to_pay RESTART IDENTITY CASCADE;
INSERT INTO survey_willingness_to_pay (price_range, customer_count, percentage) VALUES
('Below ₹200', 10, 10),
('₹200–₹249', 25, 25),
('₹250–₹299', 35, 35),
('₹300–₹349', 20, 20),
('₹350 and above', 10, 10);

-- Initialize Timer State
INSERT INTO round_timer_state (id, status, duration_seconds, remaining_seconds_on_pause)
VALUES (1, 'not_started', 720, 720)
ON CONFLICT (id) DO NOTHING;

-- Initialize Evaluation Config
INSERT INTO evaluation_config (id, is_open, scoring_mode, results_published)
VALUES (1, false, 'panel_common', false)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- QUANTRIX V2 ADDITIONS: GOOGLE SHEETS INTEGRATION & SYNC QUEUE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS google_sheets_config (
  id INT PRIMARY KEY DEFAULT 1,
  is_connected BOOLEAN DEFAULT false,
  owner_email TEXT,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  spreadsheet_title TEXT,
  created_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  recipients JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sheets_sync_queue (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
