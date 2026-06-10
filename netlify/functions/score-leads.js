const MODEL = 'claude-fable-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function buildMixedPrompt(leads, limit) {
  return `You are a lead scoring expert for the Fort Wayne Spotlight — a shared-cost homeowner postcard mailed to 5,000 homes in the southwest Fort Wayne / Aboite / Illinois Road corridor. Advertisers on this mailer are local businesses whose services homeowners actually buy. Score each lead 1–10 by following every step below in order.

━━━ STEP 1 — HARD DISQUALIFIERS (check first) ━━━
If ANY of these apply, the lead's final score is CAPPED at 4.0 regardless of other factors:
• Category is NOT a homeowner-facing service. Disqualified categories include: restaurants, bars, retail stores, gyms, salons, B2B companies, warehouses, manufacturers, offices, or any business that does not send service workers to homes or serve residential customers.
• Business is a national chain or corporate franchise with no local marketing autonomy (e.g. "Merry Maids," "Mr. Rooter," "Supercuts," or any brand with 20+ locations — a local franchise owner with purchasing authority is NOT disqualified, so use judgment).
• Address is clearly outside Fort Wayne metro (city field is not Fort Wayne, or zip is outside 46801–46825).
When capping, set watch_out = the specific disqualifying signal as a short phrase.

━━━ STEP 2 — CATEGORY FIT (primary score driver) ━━━
Assign a base score from the tier table below. Match the lead's category to the closest entry. Any category not listed = Tier 4 by default.

TIER 1 — base score 9.0 (S-tier, always pitch first):
  Roofer, HVAC Company, Landscaping Company, Lawn Care Company, Painting Contractor, Auto Repair Shop, Auto Detailer

TIER 2 — base score 7.0 (A-tier, very strong):
  Dentist, Orthodontist, Chiropractor, Physical Therapist, Real Estate Agent, Gutter Company, Window Tinting Shop, Pest Control Company

TIER 3 — base score 5.0 (B-tier, solid fillers):
  Med Spa, Weight Loss Clinic, General Contractor, Handyman, Flooring Company, Siding Contractor, Deck Builder, Mortgage Broker, Financial Advisor, Insurance Agent, Medicare Advisor, Eye Doctor, Primary Care Practice, Mental Health Counselor

TIER 4 — base score 3.0 (C-tier, last resort):
  Family Restaurant, Pizza Shop, Bakery, Coffee Shop, Martial Arts Studio, Dance Studio, Pet Groomer, Veterinarian, Dog Boarding Facility, Massage Therapist, Boutique, Furniture Store, Mattress Store, Car Wash, Hearing Aid Center, Tutoring Service, Preschool, Daycare, Bookkeeper, Accountant, Tax Preparation Service, Credit Repair Company, Business Coach, Storage Facility, Motorcycle Dealer, Meal Prep Service, Attorney, Estate Planning Attorney, Pool & Spa Company, Home Care Agency, Tire Shop, Tree Service Company, Collision Repair Shop, Concrete Contractor, Fence Company, Snow Removal Company, Moving Company, Garage Door Company

The tier base score is the starting point. All subsequent steps add or subtract from it.

━━━ STEP 3 — DECISION-MAKER TYPE ━━━
Add based on who controls the advertising decision:
• Sole owner or solo private practice — single named individual, no partners: +3.0
• Multi-doctor group or franchise with a local owner who has purchasing authority: +1.0
• Corporate or multi-location with no local decision maker: −1.0
• No contact found — blank owner/management fields: −0.5

━━━ STEP 4 — LOCATION MODIFIER ━━━
Add based on proximity to the campaign's delivery area (Illinois Road / Covington corridor, SW Fort Wayne):
• Address on Illinois Road corridor, Aboite Township (zip 46814), or zip 46804: +2.5
• Address on Covington Road or zip 46804 west of Illinois Road: +0.5
• All other Fort Wayne metro: +0.0
• Outside Fort Wayne metro: hard cap at 4.0 (already enforced in Step 1)

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
2. Verify: score[#1] − score[#5] MUST be ≥ 3.0. If less, push the top score up and/or the bottom score down until the gap is at least 3.0.
3. No two leads may share the exact same score. If a tie exists, subtract 0.1 from the lower one and repeat.

━━━ STEP 9 — WATCH_OUT FLAGS ━━━
For every lead — even high scorers — set watch_out to a short phrase if ANY of these are present:
• National chain or franchise (even if locally owned — flag it for verification)
• Only an office manager listed, no owner name
• Address outside the primary campaign delivery area
• Newly opened under 1 year — may not have ad budget
• Very high review count (300+) suggesting the business already has heavy marketing coverage
• Category is marginal or borderline for homeowner audience
• Multiple Fort Wayne locations or appears to be a group practice — flag as "multi_location"
If none apply, set watch_out = "" (empty string).

━━━ LEADS TO SCORE ━━━
${JSON.stringify(leads)}

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array of the top ${limit} highest-scoring leads, sorted descending by score. Use EXACTLY these field names — no renaming, no extras:
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

function buildSameNichePrompt(leads, niche, limit) {
  return `You are a lead scoring expert for the Fort Wayne Spotlight — a shared-cost homeowner postcard mailed to 5,000 homes in the southwest Fort Wayne / Aboite / Illinois Road corridor.

IMPORTANT: All leads in this list are ${niche} businesses. Category fit is identical for every lead — skip category scoring entirely. Differentiate instead on location proximity, decision-maker access, and contact completeness.

Score each lead 1–10 by following every step below in order.

━━━ STEP 1 — HARD DISQUALIFIERS (check first) ━━━
If ANY of these apply, the lead's final score is CAPPED at 4.0 regardless of other factors:
• Business is a national chain or corporate franchise with no local marketing autonomy (20+ locations — a local franchise owner with purchasing authority is NOT disqualified).
• Address is clearly outside Fort Wayne metro (city not Fort Wayne, or zip outside 46801–46825).
When capping, set watch_out = the specific disqualifying signal as a short phrase.

━━━ STEP 2 — CATEGORY FIT: FLAT BASE FROM TIER ━━━
All leads are ${niche}. Look up ${niche} in the tier table below and assign every lead that flat base score. Do not adjust up or down for category — all differentiation comes from Steps 3–7.

TIER 1 — base score 9.0: Roofer, HVAC Company, Landscaping Company, Lawn Care Company, Painting Contractor, Auto Repair Shop, Auto Detailer
TIER 2 — base score 7.0: Dentist, Orthodontist, Chiropractor, Physical Therapist, Real Estate Agent, Gutter Company, Window Tinting Shop, Pest Control Company
TIER 3 — base score 5.0: Med Spa, Weight Loss Clinic, General Contractor, Handyman, Flooring Company, Siding Contractor, Deck Builder, Mortgage Broker, Financial Advisor, Insurance Agent, Medicare Advisor, Eye Doctor, Primary Care Practice, Mental Health Counselor
TIER 4 — base score 3.0: Family Restaurant, Pizza Shop, Bakery, Coffee Shop, Martial Arts Studio, Dance Studio, Pet Groomer, Veterinarian, Dog Boarding Facility, Massage Therapist, Boutique, Furniture Store, Mattress Store, Car Wash, Hearing Aid Center, Tutoring Service, Preschool, Daycare, Bookkeeper, Accountant, Tax Preparation Service, Credit Repair Company, Business Coach, Storage Facility, Motorcycle Dealer, Meal Prep Service, Attorney, Estate Planning Attorney, Pool & Spa Company, Home Care Agency, Tire Shop, Tree Service Company, Collision Repair Shop, Concrete Contractor, Fence Company, Snow Removal Company, Moving Company, Garage Door Company
Any niche not listed = Tier 4 (base score 3.0) by default.

━━━ STEP 3 — DECISION-MAKER TYPE (primary differentiator) ━━━
• Sole owner or solo private practice — single named individual, no partners: +3.0
• Multi-doctor group or franchise with a local owner who has purchasing authority: +1.0
• Corporate or multi-location with no local decision maker: −1.0
• No contact found — blank owner/management fields: −0.5

━━━ STEP 4 — LOCATION MODIFIER (primary differentiator) ━━━
• Address on Illinois Road corridor, Aboite Township (zip 46814), or zip 46804: +2.5
• Address on Covington Road or zip 46804 west of Illinois Road: +0.5
• All other Fort Wayne metro: +0.0
• Outside Fort Wayne metro: hard cap at 4.0 (already enforced in Step 1)

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
3. Verify: score[#1] − score[#5] MUST be ≥ 3.0. If less, push the top score up and/or the bottom score down until the gap is ≥ 3.0.
4. No two leads may share the exact same score. If a tie exists, subtract 0.1 from the lower one and repeat.

━━━ STEP 9 — WATCH_OUT FLAGS ━━━
For every lead — even high scorers — set watch_out to a short phrase if ANY of these are present:
• National chain or franchise (even if locally owned — flag for verification)
• Only an office manager listed, no owner name
• Address outside the primary campaign delivery area
• Newly opened under 1 year — may not have ad budget
• Very high review count (300+) suggesting heavy marketing coverage already
• Multiple Fort Wayne locations or appears to be a group practice — flag as "multi_location"
If none apply, set watch_out = "" (empty string).

━━━ LEADS TO SCORE ━━━
${JSON.stringify(leads)}

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array of the top ${limit} highest-scoring leads, sorted descending by score. Use EXACTLY these field names — no renaming, no extras:
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

function buildPrompt(leads, niche, limit) {
  return niche ? buildSameNichePrompt(leads, niche, limit) : buildMixedPrompt(leads, limit)
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

  let leads, niche, limit
  try {
    const parsed = JSON.parse(event.body || '{}')
    leads = parsed.leads
    niche = typeof parsed.niche === 'string' ? parsed.niche.trim() : ''
    limit = Number.isInteger(parsed.limit) && parsed.limit > 0 ? parsed.limit : 10
    if (!Array.isArray(leads) || leads.length === 0) throw new Error('invalid')
    console.log('[score-leads] leads received:', leads.length, '— limit:', limit)
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
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(leads, niche, limit) }]
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
