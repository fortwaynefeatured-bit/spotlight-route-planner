import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const FIELD_MAP = {
  // Business name
  'business name':      'business_name',
  'business':           'business_name',
  'company name':       'business_name',
  'company':            'business_name',
  'name':               'business_name',
  'dba':                'business_name',
  'store':              'business_name',

  // Address — street-only columns get city appended in App.jsx
  'address':            'address',
  'street address':     'address',
  'street':             'address',
  'location':           'address',
  'full address':       'address',

  // Category
  'category':           'category',
  'categories':         'category',   // dental CSV uses "categories"
  'type':               'category',
  'industry':           'category',
  'niche':              'category',
  'trade':              'category',
  'service':            'category',

  // Owner / decision-maker
  'owner name':         'owner_name',
  'owner':              'owner_name',
  'contact name':       'owner_name',
  'contact':            'owner_name',
  'decision maker':     'owner_name',
  'first name':         'owner_name',
  'management':         'owner_name',   // dental BBB CSV
  'principal contacts': 'owner_name',   // dental BBB CSV

  // Phone
  'phone':              'phone',
  'phone number':       'phone',
  'telephone':          'phone',
  'mobile':             'phone',
  'cell':               'phone',
  'cell phone':         'phone',

  // Email
  'email':              'email',
  'email address':      'email',
  'e mail':             'email',
  'contact emails':     'email',        // dental BBB CSV

  // Notes
  'notes':              'notes',
  'note':               'notes',
  'comments':           'notes',
  'description':        'notes',
  'details':            'notes',
  'extra':              'notes',        // dental BBB CSV
}

function normalizeKey(raw) {
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')   // underscores + hyphens → space so "business_name" → "business name"
    .replace(/[^a-z ]/g, '') // strip remaining special chars
    .replace(/\s+/g, ' ')    // collapse whitespace
    .trim()
}

function normalizeRow(row) {
  const out = {}
  for (const [rawKey, val] of Object.entries(row)) {
    if (val == null || String(val).trim() === '') continue
    const key = normalizeKey(rawKey)
    const mapped = FIELD_MAP[key]
    if (mapped && !out[mapped]) {
      out[mapped] = String(val).trim()
    }
  }
  out._raw = row  // preserved for CSV export — never sent to scoring API
  return out
}

async function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.map(normalizeRow).filter(r => r.business_name || r.address)
        resolve(rows)
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`))
    })
  })
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return raw.map(normalizeRow).filter(r => r.business_name || r.address)
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'csv') return parseCsv(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  throw new Error(`Unsupported file type ".${ext}". Please upload a .csv or .xlsx file.`)
}
