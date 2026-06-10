const MODEL = 'claude-fable-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function buildMixedPrompt(leads) {
  return `You are a lead scoring expert for the Fort Wayne Spotlight — a shared-cost homeowner postcard mailed to 5,000 homes in the southwest Fort Wayne / Aboite / Illinois Road corridor. Advertisers on this mailer are local businesses whose services homeowners actually buy. Score each lead 1–10 by following every step below in order.

━━━ STEP 1 — HARD DISQUALIFIERS (check first) ━━━
If ANY of these apply, the lead's final score is CAPPED at 4.0 regardless of other factors:
• Category is NOT a homeowner-facing service. Disqualified categories include: restaurants, bars, retail stores, gyms, salons, B2B companies, warehouses, manufacturers, offices, or any business that does not send service workers to homes or serve residential customers.
• Business is a national chain or corporate franchise with no local marketing autonomy (e.g. "Merry Maids," "Mr. Rooter," "Supercuts," or any brand with 20+ locations — a local franchise owner with purchasing authority is NOT disqualified, so use judgment).
• Address is clearly outside Fort Wayne metro (city field is not Fort Wayne, or zip is outside 46801–46825).
When capping, set watch_out = the specific disqualifying signal as a short phrase.

━━━ STEP 2 — CATEGORY FIT (primary score driver) ━━━
Assign a Category Score (CS) based on how well the business category fits the homeowner postcard audience:

TIER 1 — CS = 9 (homeowners buy this regularly, high urgency, outdoor/seasonal demand):
  Roofing, HVAC / heating & cooling, lawn care / landscaping, pest control, exterior painting, window & door replacement, gutter cleaning, tree service, snow removal, driveway / concrete work

TIER 2 — CS = 8 (strong homeowner fit, less seasonal):
  Plumbing, electrical, garage door service, handyman / home repair, carpet / floor cleaning, house cleaning / maid service, pool service, fence installation, siding / exterior remodeling

TIER 3 — CS = 7 (homeowner-adjacent, good fit):
  Dentists / family dental, chiropractors, optometrists, veterinarians, kitchen & bath remodeling, interior painting, moving companies, auto detailing, storage

TIER 4 — CS = 5 (marginal fit — homeowners use it but not a natural postcard buy):
  Insurance agents, financial advisors, real estate agents, tutors, fitness studios

TIER 5 — CS = 2 (poor fit — cap at 4 per Step 1 if also disqualified):
  Anything not in the above tiers

The CS contributes 50% of the raw score. Raw base = CS × 0.5.

━━━ STEP 3 — DECISION-MAKER TYPE ━━━
Add based on who controls the advertising decision:
• Sole owner — single named individual runs the business, no partners: +2.0
• Owner + one partner, both owner-operated: +1.5
• Office manager or general manager only listed — no owner name: +0.5
• No contact at all — blank owner/management fields: 0

━━━ STEP 4 — LOCATION MODIFIER ━━━
Add based on proximity to the campaign's delivery area (Illinois Road / Covington corridor, SW Fort Wayne):
• Address ON Illinois Road, or Aboite Township (zip 46814): +1.5
• Address ON Covington Road, or within the Illinois / Covington intersection area: +1.2
• Zip 46804 (Indiana Ave / Lima Road corridor, SW Fort Wayne): +0.8
• Zip 46809 (Waynedale / Lower Huntington Road): +0.4
• Fort Wayne but outside SW quadrant, or zip unknown: +0.1
• Outside Fort Wayne metro: +0 (already capped in Step 1)

━━━ STEP 5 — CLOSING PROBABILITY ━━━
Businesses not currently advertising are untapped opportunities:
• No evidence of advertising, minimal web presence, few or no online reviews: +0.5
• Moderate presence, some reviews, possible light advertising: 0
• Heavy advertiser — 300+ Google reviews, active paid ads, clearly has a marketing budget already: −0.5

━━━ STEP 6 — CONTACT QUALITY ━━━
• Phone + email present: +0.3
• Phone only: 0
• No phone or email: −0.3

━━━ STEP 7 — STABILITY ━━━
Use file_opened or business_started fields if present:
• 5+ years in operation: +0.2
• Under 1 year or newly opened: −0.3

━━━ STEP 8 — ENFORCE SPREAD ━━━
After computing all five scores:
1. Round each to one decimal place.
2. Verify: score[#1] − score[#5] MUST be ≥ 2.0. If less, push the top score up and/or the bottom score down until the gap is at least 2.0.
3. No two leads may share the exact same score. If a tie exists, subtract 0.1 from the lower one and repeat.

━━━ STEP 9 — WATCH_OUT FLAGS ━━━
For every lead — even high scorers — set watch_out to a short phrase if ANY of these are present:
• National chain or franchise (even if locally owned — flag it for verification)
• Only an office manager listed, no owner name
• Address outside the primary campaign delivery area
• Newly opened under 1 year — may not have ad budget
• Very high review count (300+) suggesting the business already has heavy marketing coverage
• Category is marginal or borderline for homeowner audience
If none apply, set watch_out = "" (empty string).

━━━ LEADS TO SCORE ━━━
${JSON.stringify(leads)}

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array of the top 5 highest-scoring leads, sorted descending by score. Use EXACTLY these field names — no renaming, no extras:
- "business_name"
- "address"
- "category"
- "owner_name"
- "phone"
- "email"
- "notes"
- "score"       (number, one decimal place)
- "reason"      (one sentence, the single strongest positive differentiator, max 15 words)
- "watch_out"   (one short phrase flagging any concern, or "" if none)

Preserve all original field values exactly. Output nothing else — no markdown, no explanation, just the raw JSON array starting with [ and ending with ].`
}

function buildSameNichePrompt(leads, niche) {
  return `You are a lead scoring expert for the Fort Wayne Spotlight — a shared-cost homeowner postcard mailed to 5,000 homes in the southwest Fort Wayne / Aboite / Illinois Road corridor.

IMPORTANT: All leads in this list are ${niche} businesses. Category fit is identical for every lead — skip category scoring entirely. Differentiate instead on location proximity, decision-maker access, and contact completeness.

Score each lead 1–10 by following every step below in order.

━━━ STEP 1 — HARD DISQUALIFIERS (check first) ━━━
If ANY of these apply, the lead's final score is CAPPED at 4.0 regardless of other factors:
• Business is a national chain or corporate franchise with no local marketing autonomy (20+ locations — a local franchise owner with purchasing authority is NOT disqualified).
• Address is clearly outside Fort Wayne metro (city not Fort Wayne, or zip outside 46801–46825).
When capping, set watch_out = the specific disqualifying signal as a short phrase.

━━━ STEP 2 — CATEGORY FIT: SKIPPED ━━━
All leads are ${niche}. Assign every lead a flat base score of 5.5. Do not adjust up or down for category.

━━━ STEP 3 — DECISION-MAKER TYPE (primary differentiator) ━━━
• Sole owner — single named individual runs the business: +2.5
• Owner + one partner, both owner-operated: +2.0
• Office manager or general manager only — no owner name: +0.8
• No contact at all — blank owner/management fields: 0

━━━ STEP 4 — LOCATION MODIFIER (primary differentiator) ━━━
• Address ON Illinois Road, or Aboite Township (zip 46814): +2.5
• Address ON Covington Road, or within the Illinois / Covington area: +2.0
• Zip 46804 (Indiana Ave / Lima Road, SW Fort Wayne): +1.2
• Zip 46809 (Waynedale / Lower Huntington Road): +0.6
• Fort Wayne but outside SW quadrant, or zip unknown: +0.2
• Outside Fort Wayne metro: +0 (already capped in Step 1)

━━━ STEP 5 — CLOSING PROBABILITY ━━━
• No evidence of advertising, minimal web presence, few or no online reviews: +0.5
• Moderate presence, some reviews, possible light advertising: 0
• Heavy advertiser — 300+ Google reviews, active paid ads: −0.5

━━━ STEP 6 — CONTACT QUALITY (primary differentiator) ━━━
• Phone + email present: +0.8
• Phone only: 0
• No phone or email: −0.8

━━━ STEP 7 — STABILITY ━━━
• 5+ years in operation: +0.2
• Under 1 year or newly opened: −0.3

━━━ STEP 8 — ENFORCE SPREAD ━━━
After computing all scores:
1. Round each to one decimal place.
2. Cap any score above 10.0 at 10.0.
3. Verify: score[#1] − score[#5] MUST be ≥ 2.0. If less, push the top score up and/or the bottom score down until the gap is ≥ 2.0.
4. No two leads may share the exact same score. If a tie exists, subtract 0.1 from the lower one and repeat.

━━━ STEP 9 — WATCH_OUT FLAGS ━━━
For every lead — even high scorers — set watch_out to a short phrase if ANY of these are present:
• National chain or franchise (even if locally owned — flag for verification)
• Only an office manager listed, no owner name
• Address outside the primary campaign delivery area
• Newly opened under 1 year — may not have ad budget
• Very high review count (300+) suggesting heavy marketing coverage already
If none apply, set watch_out = "" (empty string).

━━━ LEADS TO SCORE ━━━
${JSON.stringify(leads)}

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array of the top 5 highest-scoring leads, sorted descending by score. Use EXACTLY these field names — no renaming, no extras:
- "business_name"
- "address"
- "category"
- "owner_name"
- "phone"
- "email"
- "notes"
- "score"       (number, one decimal place)
- "reason"      (one sentence, the single strongest positive differentiator, max 15 words)
- "watch_out"   (one short phrase flagging any concern, or "" if none)

Preserve all original field values exactly. Output nothing else — no markdown, no explanation, just the raw JSON array starting with [ and ending with ].`
}

function buildPrompt(leads, niche) {
  return niche ? buildSameNichePrompt(leads, niche) : buildMixedPrompt(leads)
}

export const handler = async (event) => {
  console.log('[score-leads] invoked:', event.httpMethod)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const key = process.env.ANTHROPIC_KEY
  if (!key) {
    console.error('[score-leads] ERROR: ANTHROPIC_KEY not set')
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'ANTHROPIC_KEY is not set in environment variables' })
    }
  }
  console.log('[score-leads] key present, length:', key.length)

  let leads, niche
  try {
    const parsed = JSON.parse(event.body || '{}')
    leads = parsed.leads
    niche = typeof parsed.niche === 'string' ? parsed.niche.trim() : ''
    if (!Array.isArray(leads) || leads.length === 0) throw new Error('invalid')
    console.log('[score-leads] leads received:', leads.length)
  } catch {
    console.error('[score-leads] ERROR: bad request body')
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Request body must be JSON: { "leads": [...] }' })
    }
  }

  console.log('[score-leads] calling Anthropic, model:', MODEL)

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(leads, niche) }]
    })
  })

  console.log('[score-leads] Anthropic status:', anthropicRes.status)

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.json().catch(() => ({}))
    console.error('[score-leads] Anthropic error response:', JSON.stringify(errBody, null, 2))
    return {
      statusCode: anthropicRes.status,
      headers: CORS,
      body: JSON.stringify({ error: errBody.error?.message || anthropicRes.statusText })
    }
  }

  const data = await anthropicRes.json()
  console.log('[score-leads] success, response tokens:', data.usage?.output_tokens)
  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify(data)
  }
}
