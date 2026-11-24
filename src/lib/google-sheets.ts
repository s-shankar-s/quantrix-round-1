// Google Sheets & OAuth2 Integration Library for Quantrix V2
// Uses googleapis npm package with organiser's OAuth2 credentials
// NEVER expose tokens or secrets in frontend code

import { google } from 'googleapis';
import { GoogleSheetsConfig, GoogleSheetsRecipient, SheetsSyncRecord } from '@/types';
import { serverStore } from './server-store';
import { formatIST } from './utils';

// ─── OAuth2 Client ────────────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth2 credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  owner_email: string;
}> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) throw new Error('No access token received from Google.');

  // Get owner email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || '',
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    owner_email: userInfo.email || 'unknown@gmail.com',
  };
}

async function getAuthenticatedClient() {
  const config = serverStore.getSheetsConfig();

  // Retrieve tokens from environment (set by admin OAuth flow, stored server-side only)
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const expiryDate = process.env.GOOGLE_TOKEN_EXPIRY ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY) : undefined;

  if (!accessToken && !refreshToken) {
    throw new Error('Google account not connected. Please complete OAuth2 setup in Admin Panel.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: expiryDate,
  });

  // Auto-refresh if expired
  if (expiryDate && Date.now() >= expiryDate - 60000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    } catch (e) {
      throw new Error('Google token refresh failed. Please reconnect your Google account.');
    }
  }

  return oauth2Client;
}

// ─── Spreadsheet Management ───────────────────────────────────────────────────

export async function createSpreadsheet(): Promise<{ spreadsheet_id: string; spreadsheet_url: string }> {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'QUANTRIX – THE PRICE IS RIGHT? – ROUND 1 DATA',
        locale: 'en_IN',
        timeZone: 'Asia/Kolkata',
      },
      sheets: [
        { properties: { title: 'Team_Submissions', index: 0 } },
        { properties: { title: 'Judging_Scores', index: 1 } },
        { properties: { title: 'Final_Results', index: 2 } },
        { properties: { title: 'Sync_Log', index: 3 } },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  await setupSpreadsheetHeaders(sheets, spreadsheetId);
  await formatSpreadsheetHeaders(sheets, spreadsheetId);

  serverStore.updateSheetsConfig({
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: spreadsheetUrl,
    spreadsheet_title: 'QUANTRIX – THE PRICE IS RIGHT? – ROUND 1 DATA',
    created_at: new Date().toISOString(),
  });

  return { spreadsheet_id: spreadsheetId, spreadsheet_url: spreadsheetUrl };
}

async function setupSpreadsheetHeaders(sheets: any, spreadsheetId: string) {
  const submissionsHeaders = [[
    'Submission ID', 'Team ID', 'Team Name', 'Profile ID', 'Customer Profile',
    'Q1 – Target Customer', 'Q2 – Factor 1', 'Q2 – Factor 2', 'Q2 – Factor 3',
    'Q3 – Top Price Range', 'Q4 – Recommended Price (₹)', 'Q5 – Justification',
    'Submitted At (IST)', 'Submission Type', 'Revision Number',
  ]];

  const judgingHeaders = [[
    'Team ID', 'Judge ID', 'C1 Customer ID (/20)', 'C2 Survey (/30)',
    'C3 Price (/30)', 'C4 Justification (/20)', 'Total (/100)',
    'General Comments', 'Evaluated At (IST)', 'Status',
  ]];

  const resultsHeaders = [[
    'Rank', 'Team ID', 'Team Name', 'Customer Profile', 'C1 (/20)',
    'C2 (/30)', 'C3 (/30)', 'C4 (/20)', 'Total (/100)', 'Scoring Mode', 'Published At (IST)',
  ]];

  const syncLogHeaders = [[
    'Sync ID', 'Event Type', 'Entity ID', 'Status', 'Retry Count',
    'Error Details', 'Created At (IST)', 'Completed At (IST)',
  ]];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: 'Team_Submissions!A1', values: submissionsHeaders },
        { range: 'Judging_Scores!A1', values: judgingHeaders },
        { range: 'Final_Results!A1', values: resultsHeaders },
        { range: 'Sync_Log!A1', values: syncLogHeaders },
      ],
    },
  });
}

async function formatSpreadsheetHeaders(sheets: any, spreadsheetId: string) {
  // Bold and freeze the header rows
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIds = response.data.sheets?.map((s: any) => s.properties?.sheetId) || [];

  const requests = sheetIds.flatMap((sheetId: number) => [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.067, green: 0.188, blue: 0.388 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
  ]);

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

export async function shareSpreadsheetWithRecipients(
  spreadsheetId: string,
  recipients: GoogleSheetsRecipient[]
): Promise<GoogleSheetsRecipient[]> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });

  const updated: GoogleSheetsRecipient[] = [];

  for (const recipient of recipients) {
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        requestBody: {
          type: 'user',
          role: recipient.permission === 'editor' ? 'writer' : 'reader',
          emailAddress: recipient.email,
        },
      });
      updated.push({ ...recipient, share_status: 'shared', shared_at: new Date().toISOString() });
    } catch (e: any) {
      updated.push({ ...recipient, share_status: 'failed' });
    }
  }

  return updated;
}

// ─── Data Sync Functions ──────────────────────────────────────────────────────

export async function syncSubmissionToSheets(submissionId: string): Promise<{ success: boolean; error?: string }> {
  const config = serverStore.getSheetsConfig();
  if (!config.is_connected || !config.spreadsheet_id) {
    return { success: false, error: 'Google Sheets not connected.' };
  }

  try {
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Find the submission
    const submissions = serverStore.getSubmissions();
    const sub = submissions.find((s) => s.id === submissionId || s.team_id === submissionId.replace('sub_', ''));
    if (!sub) return { success: false, error: 'Submission not found.' };

    const team = serverStore.getTeamById(sub.team_id);
    const profile = serverStore.getProfileById(team?.assigned_profile_id || 0);

    // Get revisions count
    const revisions = serverStore.getRevisions(sub.team_id);
    const revisionNumber = revisions.length;

    const row = [
      sub.id,
      sub.team_id,
      team?.team_name || sub.team_id,
      team?.assigned_profile_id?.toString() || '',
      profile?.customer_profile || '',
      sub.q1_target_customer,
      sub.q2_factor_1,
      sub.q2_factor_2,
      sub.q2_factor_3,
      sub.q3_survey_top_price_range,
      sub.q4_recommended_price?.toString() || '',
      sub.q5_price_justification,
      formatIST(sub.submitted_at || sub.last_saved_at),
      sub.is_auto_submitted ? 'Auto-Submitted' : sub.status === 'revised_and_resubmitted' ? 'Revised' : 'Manual',
      revisionNumber.toString(),
    ];

    // Check if row for this team already exists (idempotent upsert)
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheet_id,
      range: 'Team_Submissions!B:B',
    });

    const rows = existing.data.values || [];
    const existingRowIndex = rows.findIndex((r) => r[0] === sub.team_id);

    if (existingRowIndex > 0) {
      // Update existing row (1-indexed, +1 for header)
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheet_id,
        range: `Team_Submissions!A${existingRowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheet_id,
        range: 'Team_Submissions!A:O',
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    }

    serverStore.updateSheetsConfig({ last_sync_at: new Date().toISOString() });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unknown sync error.' };
  }
}

export async function syncEvaluationToSheets(evalKey: string): Promise<{ success: boolean; error?: string }> {
  const config = serverStore.getSheetsConfig();
  if (!config.is_connected || !config.spreadsheet_id) {
    return { success: false, error: 'Google Sheets not connected.' };
  }

  try {
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const [teamId, judgeId] = evalKey.split('_').slice(0, 2).join('_').split('_').reduce(
      (acc: string[], part: string, i: number) => {
        if (i < 2) acc[0] = (acc[0] || '') + (i > 0 ? '_' : '') + part;
        else acc[1] = (acc[1] || '') + (i > 2 ? '_' : '') + part;
        return acc;
      }, []
    );

    // Parse evalKey properly: format is `${teamId}_${judgeId}`
    const parts = evalKey.split('_');
    // teamId = team_XX, judgeId = judge_YY
    const tId = parts.slice(0, 2).join('_');
    const jId = parts.slice(2).join('_');

    const evaluation = serverStore.getEvaluationForTeamAndJudge(tId, jId);
    if (!evaluation) return { success: false, error: 'Evaluation not found.' };

    const row = [
      evaluation.team_id,
      evaluation.judge_id,
      evaluation.criterion_1_identification.toString(),
      evaluation.criterion_2_survey.toString(),
      evaluation.criterion_3_price.toString(),
      evaluation.criterion_4_justification.toString(),
      evaluation.total_score.toString(),
      evaluation.general_comments,
      formatIST(evaluation.evaluated_at),
      evaluation.is_final ? 'Final' : 'Draft',
    ];

    // Idempotent: check for existing row
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheet_id,
      range: 'Judging_Scores!A:B',
    });

    const rows = existing.data.values || [];
    const existingRowIndex = rows.findIndex((r) => r[0] === evaluation.team_id && r[1] === evaluation.judge_id);

    if (existingRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheet_id,
        range: `Judging_Scores!A${existingRowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheet_id,
        range: 'Judging_Scores!A:J',
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    }

    serverStore.updateSheetsConfig({ last_sync_at: new Date().toISOString() });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unknown sync error.' };
  }
}

export async function syncResultsToSheets(): Promise<{ success: boolean; error?: string }> {
  const config = serverStore.getSheetsConfig();
  if (!config.is_connected || !config.spreadsheet_id) {
    return { success: false, error: 'Google Sheets not connected.' };
  }

  const evalConfig = serverStore.getEvaluationConfig();
  if (!evalConfig.results_published) {
    return { success: false, error: 'Results are not yet published. Publish results first.' };
  }

  try {
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const scores = serverStore.computeTeamScores();
    const rankedScores = scores.filter((s) => s.is_evaluated).sort((a, b) => (a.rank || 999) - (b.rank || 999));

    const rows = rankedScores.map((s) => [
      s.rank?.toString() || '',
      s.team_id,
      s.team_name,
      s.customer_profile_name,
      s.criterion_1.toString(),
      s.criterion_2.toString(),
      s.criterion_3.toString(),
      s.criterion_4.toString(),
      s.total_score.toString(),
      evalConfig.scoring_mode === 'panel_common' ? 'Panel Common Score' : 'Individual Average',
      formatIST(evalConfig.published_at || new Date().toISOString()),
    ]);

    // Clear existing results data (preserve header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: config.spreadsheet_id,
      range: 'Final_Results!A2:K',
    });

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheet_id,
        range: 'Final_Results!A2',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });
    }

    serverStore.updateSheetsConfig({ last_sync_at: new Date().toISOString() });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unknown sync error.' };
  }
}

export async function appendSyncLogEntry(record: SheetsSyncRecord): Promise<void> {
  const config = serverStore.getSheetsConfig();
  if (!config.is_connected || !config.spreadsheet_id) return;

  try {
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheet_id,
      range: 'Sync_Log!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          record.id,
          record.event_type,
          record.entity_id,
          record.status,
          record.retry_count.toString(),
          record.error_details || '',
          formatIST(record.created_at),
          formatIST(record.completed_at),
        ]],
      },
    });
  } catch (e) {
    // Log silently — sync log errors should not cascade
    console.error('Failed to append sync log entry:', e);
  }
}

// ─── Sync Processor (Outbox Pattern with Retry) ───────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 10000, 30000]; // exponential backoff in ms

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const pending = serverStore.getPendingSyncRecords();
  let processed = 0;
  let failed = 0;

  for (const record of pending) {
    serverStore.updateSyncRecord(record.id, {
      status: 'retrying',
      attempted_at: new Date().toISOString(),
    });

    let result: { success: boolean; error?: string };

    try {
      if (record.event_type === 'submission') {
        result = await syncSubmissionToSheets(record.entity_id);
      } else if (record.event_type === 'evaluation') {
        result = await syncEvaluationToSheets(record.entity_id);
      } else if (record.event_type === 'results') {
        result = await syncResultsToSheets();
      } else {
        result = { success: false, error: 'Unknown event type' };
      }
    } catch (e: any) {
      result = { success: false, error: e.message };
    }

    if (result.success) {
      const updated = serverStore.updateSyncRecord(record.id, {
        status: 'success',
        completed_at: new Date().toISOString(),
        error_details: undefined,
      });
      if (updated) await appendSyncLogEntry(updated);
      processed++;
    } else {
      const newRetryCount = record.retry_count + 1;
      if (newRetryCount >= MAX_RETRIES) {
        const updated = serverStore.updateSyncRecord(record.id, {
          status: 'failed',
          retry_count: newRetryCount,
          error_details: result.error,
          attempted_at: new Date().toISOString(),
        });
        if (updated) await appendSyncLogEntry(updated);
        failed++;
      } else {
        serverStore.updateSyncRecord(record.id, {
          status: 'pending',
          retry_count: newRetryCount,
          error_details: result.error,
        });
      }
    }
  }

  return { processed, failed };
}

export async function retryFailedSync(): Promise<{ retried: number }> {
  const failed = serverStore.getFailedSyncRecords();
  let retried = 0;

  for (const record of failed) {
    serverStore.updateSyncRecord(record.id, {
      status: 'pending',
      retry_count: 0,
      error_details: undefined,
    });
    retried++;
  }

  if (retried > 0) {
    await processSyncQueue();
  }

  return { retried };
}

export async function testSheetsConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = serverStore.getSheetsConfig();
    if (!config.spreadsheet_id) {
      return { success: false, message: 'No spreadsheet configured. Create a spreadsheet first.' };
    }

    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheet_id });
    const title = response.data.properties?.title;

    return { success: true, message: `Connected to "${title}" successfully.` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Connection test failed.' };
  }
}
