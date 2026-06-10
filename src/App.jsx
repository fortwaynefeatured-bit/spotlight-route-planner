import { useState } from 'react'
import FileUpload from './components/FileUpload'
import LeadMap from './components/LeadMap'
import StopCard from './components/StopCard'
import { parseFile } from './utils/parseFile'
import { scoreLeads } from './utils/scoreLeads'
import { geocodeAddress } from './utils/geocode'
import { optimizeRoute } from './utils/routeOptimize'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [routeLeads, setRouteLeads] = useState([])
  const [startCoords, setStartCoords] = useState(null)
  const [startAddress, setStartAddress] = useState('Bluffton, IN')
  const [selectedNiche, setSelectedNiche] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [leadCount, setLeadCount] = useState(0)

  const handleFile = async (file) => {
    setLoading(true)
    setError('')
    setWarning('')
    setRouteLeads([])
    setStartCoords(null)

    try {
      setStatus('Parsing file...')
      const leads = await parseFile(file)

      if (leads.length === 0) {
        throw new Error(
          'No valid leads found. Check that your file has columns for: business name, address, category, phone.'
        )
      }

      if (leads.length > 50 && !selectedNiche) {
        setWarning(`${leads.length} leads found — that's too many for accurate scoring. Select a niche above to focus the list, then re-upload.`)
        return
      }

      const capped = leads.slice(0, 50)
      setLeadCount(capped.length)
      setStatus(`Scoring ${capped.length} leads with AI...`)
      const topLeads = await scoreLeads(capped, selectedNiche)

      setStatus('Geocoding addresses...')
      const addr = startAddress.trim() || 'Bluffton, IN'
      const [startGeo, ...stopGeos] = await Promise.all([
        geocodeAddress(addr),
        ...topLeads.map(lead => {
          const a = lead.address || ''
          const suffix = a.toLowerCase().includes('fort wayne') ? '' : ', Fort Wayne, IN'
          return geocodeAddress(a + suffix)
        })
      ])

      if (!startGeo) {
        throw new Error(`Could not locate start address: "${addr}". Try a full street address.`)
      }

      const geocoded = topLeads
        .map((lead, i) => (stopGeos[i] ? { ...lead, coords: stopGeos[i] } : null))
        .filter(Boolean)

      if (geocoded.length === 0) {
        throw new Error('Could not geocode any stop addresses. Check that addresses include city/state.')
      }

      setStatus('Optimizing route...')
      const ordered = optimizeRoute(startGeo, geocoded)
      const withNums = ordered.map((lead, i) => ({ ...lead, stopNum: i + 1 }))

      setStartCoords(startGeo)
      setRouteLeads(withNums)
      setStatus('')
    } catch (e) {
      setError(e.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-badge">Fort Wayne Spotlight</div>
        <h1>Route Planner</h1>
      </header>

      <div className="controls">
        <div className="field">
          <label htmlFor="start">Start Address</label>
          <input
            id="start"
            type="text"
            value={startAddress}
            onChange={e => setStartAddress(e.target.value)}
            placeholder="Bluffton, IN"
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="niche">Lead Niche</label>
          <select
            id="niche"
            value={selectedNiche}
            onChange={e => { setSelectedNiche(e.target.value); setWarning('') }}
            disabled={loading}
          >
            <option value="">— All Categories (no filter) —</option>
            <optgroup label="Tier 1 — Best Fit">
              <option>Roofing</option>
              <option>HVAC / Heating & Cooling</option>
              <option>Lawn Care / Landscaping</option>
              <option>Pest Control</option>
              <option>Exterior Painting</option>
              <option>Windows & Doors</option>
              <option>Gutters / Tree Service</option>
              <option>Snow Removal / Driveway</option>
            </optgroup>
            <optgroup label="Tier 2">
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Garage Doors</option>
              <option>Handyman / Home Repair</option>
              <option>House Cleaning / Maid Service</option>
              <option>Carpet / Floor Cleaning</option>
              <option>Fencing / Siding</option>
              <option>Pool Service</option>
            </optgroup>
            <optgroup label="Tier 3">
              <option>Dental / Chiropractic / Vet</option>
              <option>Kitchen & Bath Remodeling</option>
              <option>Interior Painting</option>
              <option>Moving / Storage</option>
              <option>Auto Detailing</option>
            </optgroup>
            <optgroup label="Tier 4">
              <option>Insurance / Financial</option>
              <option>Real Estate</option>
              <option>Fitness / Tutoring</option>
            </optgroup>
          </select>
        </div>
        <FileUpload onFile={handleFile} disabled={loading} />
      </div>

      {warning && <div className="warning-box">{warning}</div>}

      {loading && (
        <div className="status-bar">
          <div className="spinner" />
          <span>{status}</span>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {!loading && routeLeads.length > 0 && (
        <>
          <div className="route-summary">
            <span className="route-badge">{routeLeads.length} stops</span>
            <span className="route-label">Optimized from {leadCount} leads</span>
          </div>
          <LeadMap leads={routeLeads} startCoords={startCoords} />
          <div className="stops-list">
            {routeLeads.map(lead => (
              <StopCard key={lead.stopNum} lead={lead} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
