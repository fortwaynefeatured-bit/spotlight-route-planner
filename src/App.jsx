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
            <option>Accountant</option>
            <option>Assisted Living Community</option>
            <option>Attorney</option>
            <option>Auto Detailer</option>
            <option>Auto Repair Shop</option>
            <option>Bakery</option>
            <option>Bookkeeper</option>
            <option>Boutique</option>
            <option>Business Coach</option>
            <option>Car Wash</option>
            <option>Chiropractor</option>
            <option>Cleaning Service</option>
            <option>Coffee Shop</option>
            <option>Collision Repair Shop</option>
            <option>Concrete Contractor</option>
            <option>Credit Repair Company</option>
            <option>Dance Studio</option>
            <option>Daycare</option>
            <option>Deck Builder</option>
            <option>Dentist</option>
            <option>Dog Boarding Facility</option>
            <option>Dog Trainer</option>
            <option>Electrician</option>
            <option>Estate Planning Attorney</option>
            <option>Eye Doctor</option>
            <option>Family Restaurant</option>
            <option>Fence Company</option>
            <option>Financial Advisor</option>
            <option>Flooring Company</option>
            <option>Florist</option>
            <option>Furniture Store</option>
            <option>Garage Door Company</option>
            <option>General Contractor</option>
            <option>Gutter Company</option>
            <option>Handyman</option>
            <option>Hearing Aid Center</option>
            <option>Home Care Agency</option>
            <option>HVAC Company</option>
            <option>Insurance Agent</option>
            <option>Landscaping Company</option>
            <option>Lawn Care Company</option>
            <option>Martial Arts Studio</option>
            <option>Massage Therapist</option>
            <option>Mattress Store</option>
            <option>Meal Prep Service</option>
            <option>Med Spa</option>
            <option>Medicare Advisor</option>
            <option>Mental Health Counselor</option>
            <option>Mortgage Broker</option>
            <option>Motorcycle Dealer</option>
            <option>Moving Company</option>
            <option>Orthodontist</option>
            <option>Painting Contractor</option>
            <option>Pest Control Company</option>
            <option>Pet Groomer</option>
            <option>Physical Therapist</option>
            <option>Pizza Shop</option>
            <option>Plumber</option>
            <option>Pool & Spa Company</option>
            <option>Preschool</option>
            <option>Primary Care Practice</option>
            <option>Real Estate Agent</option>
            <option>Roofer</option>
            <option>Siding Contractor</option>
            <option>Snow Removal Company</option>
            <option>Storage Facility</option>
            <option>Tax Preparation Service</option>
            <option>Tire Shop</option>
            <option>Tree Service Company</option>
            <option>Tutoring Service</option>
            <option>Veterinarian</option>
            <option>Weight Loss Clinic</option>
            <option>Window Tinting Shop</option>
            <option>Youth Sports Trainer</option>
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
