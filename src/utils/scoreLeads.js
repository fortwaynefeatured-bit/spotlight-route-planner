const BULK_BATCH_SIZE = 10

export async function scoreBulk(leads, niche = '', onProgress) {
  const batches = []
  for (let i = 0; i < leads.length; i += BULK_BATCH_SIZE) {
    batches.push(leads.slice(i, i + BULK_BATCH_SIZE))
  }

  const allResults = []
  for (let i = 0; i < batches.length; i++) {
    onProgress?.(i + 1, batches.length)

    // Strip _raw before sending — only used locally for CSV export
    const cleanBatch = batches[i].map(({ _raw, ...rest }) => rest)

    const res = await fetch('/.netlify/functions/score-leads-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: cleanBatch, niche })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Scoring failed on batch ${i + 1}: ${err.error || res.statusText}`)
    }

    const data = await res.json()
    if (!Array.isArray(data)) throw new Error(`Unexpected response format for batch ${i + 1}`)

    // Re-attach _raw by matching business_name
    const rawMap = {}
    batches[i].forEach(lead => {
      const key = (lead.business_name || '').toLowerCase()
      if (lead._raw && key) rawMap[key] = lead._raw
    })

    allResults.push(...data.map(scored => ({
      ...scored,
      _raw: rawMap[(scored.business_name || '').toLowerCase()] ?? null
    })))
  }

  allResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return allResults
}

// Maps every known AI field name variation → our canonical field name
const ALIASES = {
  business_name: [
    'business_name', 'business name', 'businessName', 'Business Name', 'Business_Name',
    'name', 'Name', 'company', 'Company', 'company_name', 'companyName', 'Company Name',
    'dba', 'DBA', 'store', 'Store'
  ],
  address: [
    'address', 'Address', 'street_address', 'streetAddress', 'Street Address',
    'full_address', 'fullAddress', 'Full Address', 'location', 'Location', 'street', 'Street'
  ],
  category: [
    'category', 'Category', 'type', 'Type', 'industry', 'Industry',
    'niche', 'Niche', 'trade', 'Trade', 'service', 'Service'
  ],
  owner_name: [
    'owner_name', 'owner name', 'ownerName', 'Owner Name', 'Owner_Name',
    'owner', 'Owner', 'contact', 'Contact', 'contact_name', 'contactName',
    'Contact Name', 'decision_maker', 'decisionMaker', 'Decision Maker', 'first_name'
  ],
  phone: [
    'phone', 'Phone', 'phone_number', 'phoneNumber', 'Phone Number', 'Phone_Number',
    'telephone', 'Telephone', 'mobile', 'Mobile', 'cell', 'Cell', 'cell_phone'
  ],
  email: [
    'email', 'Email', 'email_address', 'emailAddress', 'Email Address',
    'Email_Address', 'e-mail', 'E-mail', 'e_mail'
  ],
  notes: [
    'notes', 'Notes', 'note', 'Note', 'comments', 'Comments',
    'description', 'Description', 'details', 'Details', 'info', 'Info'
  ],
  score: ['score', 'Score', 'rating', 'Rating'],
  reason: ['reason', 'Reason', 'explanation', 'Explanation', 'summary', 'Summary', 'rationale'],
  watch_out: ['watch_out', 'watchOut', 'watch out', 'Watch Out', 'Watch_Out', 'flag', 'Flag', 'warning', 'Warning', 'caution', 'Caution']
}

function normalizeLead(lead) {
  const out = { ...lead }
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    if (out[canonical] != null && String(out[canonical]).trim()) continue
    for (const alias of aliases) {
      if (lead[alias] != null && String(lead[alias]).trim()) {
        out[canonical] = String(lead[alias]).trim()
        break
      }
    }
  }
  return out
}

export async function scoreLeads(leads, niche = '', limit = 10) {
  const res = await fetch('http://localhost:8888/.netlify/functions/score-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads, niche, limit })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`AI scoring failed (${res.status}): ${err.error || res.statusText}`)
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim()

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI returned an unexpected format. Please try again.')

  let parsed
  try {
    parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty')
  } catch {
    throw new Error('Could not parse AI response. Please try again.')
  }

  return parsed.map(normalizeLead)
}
