// Integration Test Suite for Quantrix V2
const http = require('http');

const BASE_URL = 'http://localhost:3005';

function request(options, body) {
  return new Promise((resolve, reject) => {
    options.port = 3005;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function getCookie(headers) {
  const sc = headers['set-cookie'];
  if (!sc) return null;
  const cookieStr = Array.isArray(sc) ? sc[0] : sc;
  return cookieStr.split(';')[0];
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   QUANTRIX V2 COMPREHENSIVE ACCEPTANCE TEST SUITE   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Landing Page includes Display route
    console.log('--> Test 1: Landing Page includes Display route');
    const home = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
    assert(home.statusCode === 200, 'Home page returns 200 OK');
    assert(home.body.includes('/display'), 'Home page contains /display link');

    // 2. Display mode public access (no login required)
    console.log('\n--> Test 2: Event Hall Display Mode (/display) public endpoint');
    const dispPage = await request({ hostname: 'localhost', port: 3000, path: '/display', method: 'GET' });
    assert(dispPage.statusCode === 200, '/display page returns 200 OK without authentication');

    const dispApi = await request({ hostname: 'localhost', port: 3000, path: '/api/display', method: 'GET' });
    assert(dispApi.statusCode === 200 && dispApi.json && dispApi.json.success, '/api/display returns live telemetry');
    assert(typeof dispApi.json.stats.teams_total === 'number', 'Telemetry includes teams count');
    assert(typeof dispApi.json.stats.mission_completion === 'object', 'Telemetry includes mission completion statistics');

    // 3. Admin Login & Sheets Settings Section
    console.log('\n--> Test 3: Admin authentication & Google Sheets section');
    const adminLogin = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { username: 'admin', password: 'QuantrixAdmin@2026!' }
    );
    assert(adminLogin.statusCode === 200 && adminLogin.json.success, 'Admin logged in successfully');
    const adminCookie = getCookie(adminLogin.headers);

    const adminData = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    assert(adminData.statusCode === 200 && adminData.json.success, 'Admin data fetched successfully');
    assert(adminData.json.sheetsConfig !== undefined, 'Admin payload includes sheetsConfig');
    assert(adminData.json.syncStats !== undefined, 'Admin payload includes syncStats');
    assert(adminData.json.syncQueue !== undefined, 'Admin payload includes syncQueue');

    // 4. Team 01 Login & Market Intelligence Mission Interface
    console.log('\n--> Test 4: Team 01 Login & Mission Access');
    const teamLogin = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { username: 'team_01', password: 'TeamPass@01' }
    );
    assert(teamLogin.statusCode === 200 && teamLogin.json.success, 'Team 01 logged in successfully');
    const teamCookie = getCookie(teamLogin.headers);

    const teamSub = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/submissions',
      method: 'GET',
      headers: { Cookie: teamCookie },
    });
    assert(teamSub.statusCode === 200 && teamSub.json.success, 'Team 01 submission retrieved');
    assert(teamSub.json.profile.indicative_wtp === undefined, 'Confidential benchmark is STRIPPED from Team 01 payload');

    // 5. Team 01 Autosave Across Missions
    console.log('\n--> Test 5: Team 01 Autosave across missions');
    const autosave = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/submissions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: teamCookie },
      },
      {
        action: 'autosave',
        answers: {
          q1_target_customer: 'Budget-conscious college student looking for durable, inexpensive bottle.',
          q2_factor_1: 'Affordable price',
          q2_factor_2: 'Basic durability',
          q2_factor_3: 'Leak-proof seal',
          q3_survey_top_price_range: '₹250–₹299',
          q4_recommended_price: 249,
          q5_price_justification: 'The customer has a limited budget of ₹2500-4000. Price is their primary purchase factor, so pricing at ₹249 captures high willingness to pay while remaining strictly under the ₹250 threshold.',
        },
      }
    );
    assert(autosave.statusCode === 200 && autosave.json.success, 'Mission autosave succeeded');
    assert(autosave.json.submission.mission_progress.badges_earned.length === 4, 'All 4 badges earned upon full answers');

    // 6. Team 01 Final Submit & Google Sheets Sync Queue Trigger
    console.log('\n--> Test 6: Team 01 Final Submit & Outbox Sync Queue');
    const submitRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/submissions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: teamCookie },
      },
      { action: 'submit' }
    );
    assert(submitRes.statusCode === 200 && submitRes.json.success, 'Team 01 finalized and locked submission');
    assert(submitRes.json.submission.status === 'submitted', 'Status transitioned to submitted');

    // Verify queue in admin
    const adminCheckQueue = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/google/sheets',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    assert(adminCheckQueue.statusCode === 200 && adminCheckQueue.json.success, 'Admin accessed Sheets sync records');
    assert(adminCheckQueue.json.queue.length > 0, 'Submission queued into sheets_sync_queue');
    assert(adminCheckQueue.json.queue[0].event_type === 'submission', 'Queue record event_type is submission');

    // 7. Judge Evaluation & Score Rubric
    console.log('\n--> Test 7: Judge Evaluation & Score Calculation');
    const judgeLogin = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { username: 'judge_01', password: 'Judge2026!' }
    );
    assert(judgeLogin.statusCode === 200 && judgeLogin.json.success, 'Judge 01 logged in successfully');
    const judgeCookie = getCookie(judgeLogin.headers);

    // Open evaluations via admin
    await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/evaluations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      },
      { action: 'update_config', configData: { is_open: true } }
    );

    const evalRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/evaluations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: judgeCookie },
      },
      {
        action: 'save_evaluation',
        teamId: 'team_01',
        evaluationData: {
          criterion_1_identification: 18,
          criterion_2_survey: 28,
          criterion_3_price: 27,
          criterion_4_justification: 18,
          general_comments: 'Excellent customer persona mapping and rigorous pricing justification.',
          is_final: true,
        },
      }
    );
    assert(evalRes.statusCode === 200 && evalRes.json.success, 'Judge evaluation locked with score 91/100');

    // 8. Display Screen Updates with Progress
    console.log('\n--> Test 8: Display Screen Telemetry Updates');
    const updatedDisp = await request({ hostname: 'localhost', port: 3000, path: '/api/display', method: 'GET' });
    assert(updatedDisp.json.stats.submissions_completed >= 1, 'Display confirms 1+ submissions completed');
    assert(updatedDisp.json.stats.mission_completion.mission_01 >= 1, 'Display shows Mission 01 completed by Team 01');

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
