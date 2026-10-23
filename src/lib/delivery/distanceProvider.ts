export interface Coordinates {
  lat: number
  lng: number
}

export interface RouteDistanceResult {
  distanceKm: number
  durationMinutes: number
  durationLabel: string
  isWithinRadius: boolean
  maxRadiusKm: number
  routeProvider: string
  error?: string
}

const MAX_DELIVERY_RADIUS_KM = 30 // Maximum motorcycle delivery radius for fresh cold asinan/rujak

export class DistanceProvider {
  /**
   * Calculate real road driving distance and estimated travel duration between coordinates
   */
  static async calculateRouteDistance(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<RouteDistanceResult> {
    // 1. Try real OpenStreetMap OSRM Road Routing API
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500) // 3.5s timeout

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const distanceMeters = route.distance || 0
          const durationSeconds = route.duration || 0

          const distanceKm = Math.max(1, Math.round((distanceMeters / 1000) * 10) / 10)
          const durationMinutes = Math.max(10, Math.round(durationSeconds / 60))

          return {
            distanceKm,
            durationMinutes,
            durationLabel: this.formatDuration(durationMinutes),
            isWithinRadius: distanceKm <= MAX_DELIVERY_RADIUS_KM,
            maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
            routeProvider: 'OSRM_REAL_ROAD_NETWORK',
          }
        }
      }
    } catch {
      // Fall through to high-precision road factor estimation
    }

    // 2. High-Precision Road Factor Estimation Fallback
    // Indonesian urban roads typically have a winding factor of ~1.30 - 1.40x compared to straight line
    const straightLineKm = this.calculateHaversine(origin, destination)
    const roadWindingFactor = 1.35
    const distanceKm = Math.max(1, Math.round(straightLineKm * roadWindingFactor * 10) / 10)
    // Urban motorcycle speed average: ~22 km/h + 10 mins buffer
    const durationMinutes = Math.max(15, Math.round((distanceKm / 22) * 60 + 10))

    return {
      distanceKm,
      durationMinutes,
      durationLabel: this.formatDuration(durationMinutes),
      isWithinRadius: distanceKm <= MAX_DELIVERY_RADIUS_KM,
      maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
      routeProvider: 'ROAD_NETWORK_ESTIMATOR_FALLBACK',
    }
  }

  /**
   * Calculate straight line distance (Haversine formula in KM)
   */
  static calculateHaversine(pointA: Coordinates, pointB: Coordinates): number {
    const R = 6371 // Earth radius in km
    const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180
    const dLon = ((pointB.lng - pointA.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pointA.lat * Math.PI) / 180) *
        Math.cos((pointB.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Format minutes to human readable Indonesian duration label
   */
  private static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} Menit`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return remainingMins > 0 ? `${hours} Jam ${remainingMins} Menit` : `${hours} Jam`
  }
}
