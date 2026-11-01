import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import MapFloatingHeader from '../src/components/map/MapFloatingHeader.vue'
import { buildSharedMapRouteUrl, createSecureMapRouteUrl, updateMapViewUrl } from '../src/utils/mapSharedLink'

vi.mock('../src/components/Profile.vue', () => ({ default: { render: () => null } }))
vi.mock('../src/stores/auth', () => ({ useAuthStore: () => ({ isAuthenticated: false }) }))

const polygon: [number, number][] = [[51.4, 35.7], [51.401, 35.7], [51.401, 35.701]]
const token = 'k1.' + 'a'.repeat(100)
let app: ReturnType<typeof createApp> | undefined
let host: HTMLDivElement
let popup: { opener: unknown; location: { replace: ReturnType<typeof vi.fn> }; close: ReturnType<typeof vi.fn> }
let fetcher: ReturnType<typeof vi.fn>

beforeEach(() => {
  window.history.replaceState({ position: 4 }, '', '/#/map?lat=35.500000&lng=51.500000&zoom=5.00')
  host = document.createElement('div')
  document.body.append(host)
  popup = { opener: window, location: { replace: vi.fn() }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
  fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token }) })
  vi.stubGlobal('fetch', fetcher)
})

afterEach(() => {
  app?.unmount(); app = undefined; host.remove()
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})

function mountHeader(sync?: () => void) {
  app = createApp(MapFloatingHeader)
  app.component('router-link', { render: () => h('a') })
  if (sync) app.provide('syncSharedMapView', sync)
  app.mount(host)
}

function service(label: string) {
  return [...host.querySelectorAll<HTMLElement>('a,button')].find((a) => a.textContent?.trim() === label)!
}

function activate(element: HTMLElement, type = 'click') {
  element.addEventListener(type, (event) => event.preventDefault(), { once: true })
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: type === 'auxclick' ? 1 : 0 }))
}

async function flushLink() {
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await nextTick()
}

describe('secure map to kroki navigation', () => {
  it.each(['click', 'auxclick'])('encrypts the current live drawing before opening Kroki (%s)', async (event) => {
    const sync = vi.fn(() => updateMapViewUrl({ lat: 35.7, lng: 51.4, zoom: 19, polygon }))
    mountHeader(sync)
    const button = service('\u06a9\u0631\u0648\u06a9\u06cc')
    expect(button.tagName).toBe('BUTTON')
    expect(button.hasAttribute('href')).toBe(false)
    activate(button, event)
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    await flushLink()
    expect(sync).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledOnce()
    const [apiUrl, options] = fetcher.mock.calls[0]
    expect(apiUrl).not.toContain('polygon')
    expect(apiUrl).toContain('/api/map-links/seal')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body).query.polygon).toBe('51.400000,35.700000;51.401000,35.700000;51.401000,35.701000')
    const url = new URL(popup.location.replace.mock.calls[0][0])
    expect([...new URLSearchParams(url.hash.split('?')[1]).keys()]).toEqual(['map'])
    expect(url.href).not.toContain('51.4')
    expect(url.href).not.toContain('polygon')
    expect(popup.opener).toBeNull()
  })

  it('fails closed when encryption fails, with no plaintext navigation fallback', async () => {
    fetcher.mockResolvedValue({ ok: false, json: async () => ({ error: 'unavailable' }) })
    mountHeader(() => updateMapViewUrl({ polygon }))
    activate(service('\u06a9\u0631\u0648\u06a9\u06cc'))
    await flushLink()
    expect(popup.location.replace).not.toHaveBeenCalled()
    expect(popup.close).toHaveBeenCalledOnce()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('unavailable')
    expect(service('\u06a9\u0631\u0648\u06a9\u06cc').hasAttribute('href')).toBe(false)
  })

  it('prevents duplicate transfers while a request is pending', async () => {
    fetcher.mockReturnValue(new Promise(() => {}))
    mountHeader(() => updateMapViewUrl({ polygon }))
    const button = service('\u06a9\u0631\u0648\u06a9\u06cc')
    activate(button); activate(button)
    await nextTick()
    expect(window.open).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledOnce()
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('handles blocked popups without uploading or exposing coordinates', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    mountHeader()
    activate(service('\u06a9\u0631\u0648\u06a9\u06cc'))
    await flushLink()
    expect(fetcher).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('rejects invalid encrypted server responses', async () => {
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ token: 'polygon=51,35' }) })
    await expect(createSecureMapRouteUrl('http://localhost:5174')).rejects.toThrow()
  })

  it.each(['click', 'auxclick', 'contextmenu'])('retains the existing inquiry link behavior (%s)', async (event) => {
    mountHeader()
    updateMapViewUrl({ lat: 35.7, lng: 51.4, zoom: 18, polygon })
    await nextTick()
    const anchor = service('\u0627\u0633\u062a\u0639\u0644\u0627\u0645') as HTMLAnchorElement
    activate(anchor, event)
    expect(new URLSearchParams(new URL(anchor.href).hash.split('?')[1]).get('polygon')).toBeTruthy()
  })

  it('keeps legacy input and router history metadata', () => {
    window.history.replaceState({ position: 4 }, '', '/?polygon=51.4,35.7;51.401,35.7;51.401,35.701#/map')
    expect(new URL(buildSharedMapRouteUrl('http://localhost:5174')).hash).toContain('polygon')
    updateMapViewUrl({ polygon })
    expect(window.history.state).toEqual({ position: 4 })
  })
})
