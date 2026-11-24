# QUANTRIX – THE PRICE IS RIGHT? (VERSION 2)
## Round 1: Know Your Customer • Market Intelligence Mission
### Thiagarajar School of Management, Madurai

---

## 🌟 Version 2 Highlights & Upgrades

Version 2 builds upon the enterprise architecture of Version 1, adding three core enhancements:

1. **Gamified Participant Experience ("Market Intelligence Mission")**:
   - The conventional form is restructured into 4 sequential interactive missions:
     - **Mission 01**: Decode the Customer (Q1 & Q2 - Target Persona & Key Purchase Drivers)
     - **Mission 02**: Read the Market (Q3 - Willingness-to-pay Survey Analysis)
     - **Mission 03**: Set Your Price (Q4 - Rupee Price Recommendation)
     - **Mission 04**: Defend Your Decision (Q5 - Analytical Reasoning & Defense)
   - Real-time progress HUD with 4 non-scoring completion badges:
     - 🏅 *Customer Detective*
     - 🏅 *Data Decoder*
     - 🏅 *Pricing Strategist*
     - 🏅 *Business Thinker*
   - Free navigation across missions with non-locking transitions.
   - Animated final lock-in modal with unique confirmation code (`QX-R1-XXXXXX`).

2. **Event Hall Display Mode (`/display`)**:
   - Projector-optimized screen with dark theme, large countdown clock, and live telemetry:
     - Logged-in team count
     - Submissions finalized vs working
     - Aggregate mission progress bars across all 15 teams
   - Complete privacy protection: No individual team answers, marks, or rankings are displayed.

3. **Google Sheets Real-Time Synchronization**:
   - Automated creation of official spreadsheet: **QUANTRIX – THE PRICE IS RIGHT – ROUND 1 DATA**
   - 4 pre-formatted tabs:
     1. `Team_Submissions` (all questions, timestamp in IST, revision numbers)
     2. `Judging_Scores` (100-mark rubric breakdowns, comments, status)
     3. `Final_Results` (published rankings, total marks, scoring mode)
     4. `Sync_Log` (sync history, retry count, status)
   - Secure Outbox architecture with automatic exponential backoff retry (3 attempts).
   - Admin Google Sheets Control Panel in Admin Control Centre with OAuth2 connection, recipient sharing, manual retry, and test connection buttons.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 10+

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your Google OAuth2 credentials in `.env.local`:
```ini
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

### 3. Build & Run
```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

### 4. Running Acceptance Tests
```bash
node test-suite-v2.js
```

---

## 👥 Default Credentials

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `QuantrixAdmin@2026!` |
| **Team 01–15** | `team_01` to `team_15` | `TeamPass@01` to `TeamPass@15` |
| **Lead Judge** | `judge_01` | `Judge2026!` |

---

## 🔒 Security Architecture
- Supabase PostgreSQL schema with Row-Level Security (RLS).
- In-memory fallback layer ensures full local execution without external DB dependencies.
- HTTP-only signed session cookies with 7-day expiry.
- Server-side stripping of confidential `indicative_wtp` benchmarks for all team requests.
- Anti-cheat telemetry: Records tab switching, copying, and window blur events.
