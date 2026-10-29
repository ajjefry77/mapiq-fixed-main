export type SharedMapState = {
  lat?: number
  lng?: number
  zoom?: number
  height?: number
  pitch?: number
  heading?: number
  point?: [number, number]
  polygon?: [number, number][]
  tool?: string
}

type NumberValue = number | undefined

type CoordinateTuple = [number, number]

const MAP_STATE_KEYS = ["lat", "lng", "lon", "zoom", "z", "height", "pitch", "heading", "point", "polygon", "tool"] as const

function parseNumber(value: string | null): NumberValue {
  if (value == null) return undefined

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function parseCoordinatePair(value: string): CoordinateTuple | undefined {
  const items = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))

  if (items.length < 2) return undefined

  return [items[0], items[1]]
}

function parsePolygon(value: string): CoordinateTuple[] | undefined {
  const parsedPoints = value
    .split(";")
    .map((segment) => parseCoordinatePair(segment))
    .filter((coordinate): coordinate is CoordinateTuple => coordinate != null)

  return parsedPoints.length >= 3 ? parsedPoints : undefined
}

function getUrlParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash || ""

  if (!hash.includes("?")) return params

  const queryString = hash.slice(hash.indexOf("?") + 1)
  const hashParams = new URLSearchParams(queryString)

  for (const [key, value] of hashParams.entries()) {
    if (!params.has(key)) params.set(key, value)
  }

  return params
}

function toFixedValue(value: number, digits: number): string {
  return Number(value).toFixed(digits)
}

export function readMapViewParams(): SharedMapState {
  const params = getUrlParams()

  const lat = parseNumber(params.get("lat"))
  const lng = parseNumber(params.get("lng") ?? params.get("lon"))
  const zoom = parseNumber(params.get("zoom") ?? params.get("z"))
  const height = parseNumber(params.get("height"))
  const pitch = parseNumber(params.get("pitch"))
  const heading = parseNumber(params.get("heading"))

  const pointValue = params.get("point")
  const point = pointValue ? parseCoordinatePair(pointValue) : undefined

  const polygonValue = params.get("polygon")
  const polygon = polygonValue ? parsePolygon(polygonValue) : undefined

  const tool = params.get("tool") || undefined

  return { lat, lng, zoom, height, pitch, heading, point, polygon, tool }
}

export function updateMapViewUrl(state: SharedMapState = {}): void {
  const url = new URL(window.location.href)
  const hash = url.hash || "#/"
  const hashQueryIndex = hash.indexOf("?")
  const hashBase = hashQueryIndex >= 0 ? hash.slice(0, hashQueryIndex) : hash
  const hashParams = new URLSearchParams(hashQueryIndex >= 0 ? hash.slice(hashQueryIndex + 1) : "")

  for (const key of MAP_STATE_KEYS) {
    hashParams.delete(key)
  }

  if (state.lat != null) hashParams.set("lat", toFixedValue(state.lat, 6))
  if (state.lng != null) hashParams.set("lng", toFixedValue(state.lng, 6))
  if (state.zoom != null) hashParams.set("zoom", toFixedValue(state.zoom, 2))
  if (state.height != null) hashParams.set("height", toFixedValue(state.height, 2))
  if (state.pitch != null) hashParams.set("pitch", toFixedValue(state.pitch, 2))
  if (state.heading != null) hashParams.set("heading", toFixedValue(state.heading, 2))
  if (state.point) {
    hashParams.set("point", `${toFixedValue(state.point[0], 6)},${toFixedValue(state.point[1], 6)}`)
  }
  if (state.polygon && state.polygon.length >= 3) {
    hashParams.set(
      "polygon",
      state.polygon
        .map(([lng, lat]) => `${toFixedValue(lng, 6)},${toFixedValue(lat, 6)}`)
        .join(";"),
    )
  }
  if (state.tool) hashParams.set("tool", state.tool)

  url.hash = `${hashBase}${hashParams.toString() ? `?${hashParams.toString()}` : ""}`
  const nextUrl = `${url.pathname}${url.search}${url.hash}`

  window.history.replaceState({}, "", nextUrl)
}

export function buildSharedMapRouteUrl(baseUrl: string, targetRoute = "/draw"): string {
  const currentHash = window.location.hash || ""
  const currentQuery = currentHash.includes("?") ? currentHash.slice(currentHash.indexOf("?") + 1) : ""
  const currentParams = new URLSearchParams(currentQuery)
  const sharedParams = new URLSearchParams()

  for (const key of MAP_STATE_KEYS) {
    const value = currentParams.get(key)
    if (value != null && value !== "") sharedParams.set(key, value)
  }

  const target = new URL(baseUrl)
  const routeHash = targetRoute.startsWith("#") ? targetRoute : `#${targetRoute.startsWith("/") ? targetRoute : `/${targetRoute}`}`

  target.hash = `${routeHash}${sharedParams.toString() ? `?${sharedParams.toString()}` : ""}`

  return target.toString()
}
