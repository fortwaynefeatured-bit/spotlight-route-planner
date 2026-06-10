export async function geocodeAddress(address) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) throw new Error('VITE_MAPBOX_TOKEN is not set in your .env file.')

  const encoded = encodeURIComponent(address)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=US&limit=1&types=address,place,locality,neighborhood`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Geocoding request failed for "${address}": ${res.statusText}`)
  }

  const data = await res.json()
  if (!data.features?.length) return null

  return data.features[0].center // [lng, lat]
}
