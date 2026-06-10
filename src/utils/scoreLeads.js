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

export async function scoreLeads(leads, niche = '') {
  const res = await fetch('http://localhost:8888/.netlify/functions/score-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads, niche })
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
