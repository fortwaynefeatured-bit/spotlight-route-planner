import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function LeadMap({ leads, startCoords }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!leads.length || !startCoords || !containerRef.current) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: startCoords,
      zoom: 11,
      attributionControl: false
    })

    mapRef.current = map

    map.addControl(new mapboxgl.AttributionControl({ compact: true }))

    map.on('load', () => {
      const routeCoords = [startCoords, ...leads.map(l => l.coords)]

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoords }
        }
      })

      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#000',
          'line-width': 6,
          'line-opacity': 0.4
        }
      })

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-dasharray': [2, 1.8]
        }
      })

      leads.forEach(lead => {
        const el = document.createElement('div')
        el.className = 'marker-stop'
        el.textContent = lead.stopNum

        const popup = new mapboxgl.Popup({ offset: 18, closeButton: true })
          .setHTML(
            `<div class="popup-inner">
              <strong>Stop ${lead.stopNum}: ${lead.business_name || ''}</strong>
              <p>${lead.address || ''}</p>
              ${lead.owner_name ? `<p>${lead.owner_name}</p>` : ''}
              <p class="popup-score">Score: ${lead.score}/10</p>
              <p class="popup-reason">${lead.reason || ''}</p>
            </div>`
          )

        new mapboxgl.Marker({ element: el })
          .setLngLat(lead.coords)
          .setPopup(popup)
          .addTo(map)
      })

      const startEl = document.createElement('div')
      startEl.className = 'marker-start'
      startEl.textContent = 'S'
      new mapboxgl.Marker({ element: startEl })
        .setLngLat(startCoords)
        .addTo(map)

      const bounds = new mapboxgl.LngLatBounds()
      routeCoords.forEach(c => bounds.extend(c))
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [leads, startCoords])

  return <div ref={containerRef} className="map-container" />
}
