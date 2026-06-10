import { useState } from 'react'

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim()) return String(obj[k]).trim()
  }
  return ''
}

export default function StopCard({ lead }) {
  const [copied, setCopied] = useState(false)

  const name    = pick(lead, 'business_name', 'business name', 'businessName', 'name', 'company', 'Business Name', 'Company')
  const owner   = pick(lead, 'owner_name', 'owner name', 'ownerName', 'owner', 'contact', 'contact_name', 'Owner Name', 'Owner')
  const address = pick(lead, 'address', 'Address', 'street_address', 'Street Address')
  const category= pick(lead, 'category', 'Category', 'type', 'Type', 'industry', 'Industry')
  const rawPhone= pick(lead, 'phone', 'Phone', 'phone_number', 'Phone Number', 'telephone', 'mobile')
  const cleanPhone = rawPhone.replace(/\D/g, '')

  const mapsUrl = address
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : null

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
    } catch {
      const el = document.createElement('textarea')
      el.value = address
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="stop-card">
      <div className="stop-num">{lead.stopNum}</div>
      <div className="stop-body">

        <div className="stop-name">{name || '—'}</div>

        {category && <span className="stop-category">{category}</span>}

        {owner && <div className="stop-owner">👤 {owner}</div>}

        {address && <div className="stop-address">📍 {address}</div>}

        {rawPhone && <div className="stop-phone-text">📞 {rawPhone}</div>}

        {lead.reason && <div className="stop-reason">"{lead.reason}"</div>}

        {lead.watch_out && (
          <div className="stop-watch-out">
            ⚠ {lead.watch_out}
          </div>
        )}

        <div className="stop-actions">
          {cleanPhone && (
            <a href={`tel:${cleanPhone}`} className="action-btn action-call">
              Call
            </a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="action-btn action-maps">
              Maps
            </a>
          )}
          {address && (
            <button onClick={copyAddress} className={`action-btn action-copy ${copied ? 'copied' : ''}`}>
              {copied ? 'Copied!' : 'Copy Addr'}
            </button>
          )}
        </div>

        <div className="stop-score-row">
          <span className="stop-score">AI Score: {lead.score}/10</span>
        </div>

      </div>
    </div>
  )
}
