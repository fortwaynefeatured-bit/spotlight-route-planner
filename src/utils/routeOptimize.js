function dist([lng1, lat1], [lng2, lat2]) {
  const dx = lng1 - lng2
  const dy = lat1 - lat2
  return dx * dx + dy * dy // squared distance — no sqrt needed for comparison
}

export function optimizeRoute(startCoords, leads) {
  const unvisited = [...leads]
  const route = []
  let current = startCoords

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = dist(current, unvisited[0].coords)

    for (let i = 1; i < unvisited.length; i++) {
      const d = dist(current, unvisited[i].coords)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    route.push(unvisited[nearestIdx])
    current = unvisited[nearestIdx].coords
    unvisited.splice(nearestIdx, 1)
  }

  return route
}
