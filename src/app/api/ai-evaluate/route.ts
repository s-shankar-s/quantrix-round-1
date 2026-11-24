import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'judge')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const body = await req.json().catch(() => ({}));
    const { teamId } = body;

    const teams = serverStore.getTeams();
    const profiles = serverStore.getProfiles(true); // includes benchmarks
    const submissions = serverStore.getSubmissions();

    const targetTeams = teamId 
      ? teams.filter((t) => t.team_id === teamId)
      : teams;

    const evaluatedResults: any[] = [];
    const errors: any[] = [];

    for (const team of targetTeams) {
      const sub = submissions.find((s) => s.team_id === team.team_id);
      if (!sub || (sub.status === 'not_started' && !sub.q1_target_customer)) {
        continue; // skip teams with no submission
      }

      const profile = profiles.find((p) => p.id === team.assigned_profile_id);

      let scores = {
        criterion_1: 15,
        criterion_2: 22,
        criterion_3: 22,
        criterion_4: 15,
        strengths: 'Good effort aligning customer traits with target factors.',
        areas_for_improvement: 'Quantitative rationale could be deeper and more tightly bounded.',
        general_comments: 'Baseline auto-evaluation reference.',
      };

      if (apiKey) {
        try {
          const prompt = `You are an expert business judge evaluating a pricing competition named "The Price Is Right?".
Score the following team submission strictly according to the 4 rubrics:
1. Customer Identification (Max 20 pts): Did they accurately understand profile ${profile?.customer_profile || ''} (Age: ${profile?.age_range || ''}, Income: ${profile?.budget_income_context || ''}, Preferred: ${profile?.preferred_product || ''})?
2. Survey & Purchase Factor Alignment (Max 30 pts): Did their 3 factors match or reasonably explain purchase drivers?
3. Recommended Price Appropriateness (Max 30 pts): Indicative benchmark WTP is "${profile?.indicative_wtp || 'N/A'}". How close/logical is their recommended price of ${sub.q4_recommended_price ?? 'N/A'}?
4. Strategic Justification (Max 20 pts): Depth, clarity, and viability of their pricing defense.

Team Submission:
- Q1 Target Customer: ${sub.q1_target_customer}
- Q2 Factors: 1: ${sub.q2_factor_1}, 2: ${sub.q2_factor_2}, 3: ${sub.q2_factor_3}
- Q3 Top Survey Price Range: ${sub.q3_survey_top_price_range}
- Q4 Recommended Price: ${sub.q4_recommended_price}
- Q5 Justification: ${sub.q5_price_justification}

Return ONLY valid JSON with this exact schema:
{
  "criterion_1": number (0-20),
  "criterion_2": number (0-30),
  "criterion_3": number (0-30),
  "criterion_4": number (0-20),
  "strengths": string,
  "areas_for_improvement": string,
  "general_comments": string
}`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
              })
            }
          );

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              scores = {
                criterion_1: Math.min(20, Math.max(0, Number(parsed.criterion_1) || 15)),
                criterion_2: Math.min(30, Math.max(0, Number(parsed.criterion_2) || 20)),
                criterion_3: Math.min(30, Math.max(0, Number(parsed.criterion_3) || 20)),
                criterion_4: Math.min(20, Math.max(0, Number(parsed.criterion_4) || 15)),
                strengths: parsed.strengths || scores.strengths,
                areas_for_improvement: parsed.areas_for_improvement || scores.areas_for_improvement,
                general_comments: parsed.general_comments || scores.general_comments,
              };
            }
          }
        } catch (err: any) {
          console.error(`AI evaluation API error for team ${team.team_id}:`, err);
          errors.push({ teamId: team.team_id, error: err.message });
        }
      }

      // Save as ai_evaluator
      const total = scores.criterion_1 + scores.criterion_2 + scores.criterion_3 + scores.criterion_4;
      serverStore.saveEvaluation(team.team_id, 'ai_evaluator', {
        criterion_1_identification: scores.criterion_1,
        criterion_2_survey: scores.criterion_2,
        criterion_3_price: scores.criterion_3,
        criterion_4_justification: scores.criterion_4,
        strengths: scores.strengths,
        areas_for_improvement: scores.areas_for_improvement,
        general_comments: `[AI Auto-Evaluation Reference] ${scores.general_comments}`,
        is_final: false,
      });

      evaluatedResults.push({
        team_id: team.team_id,
        team_name: team.team_name,
        scores,
        total_score: total,
      });
    }

    serverStore.logAuditAction(
      session.userId,
      session.role,
      'RUN_AI_AUTO_EVALUATION',
      'judge_evaluations',
      teamId || 'all_teams',
      { count: evaluatedResults.length }
    );

    return NextResponse.json({
      success: true,
      evaluated_count: evaluatedResults.length,
      evaluated: evaluatedResults,
      has_gemini_key: !!apiKey,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
