// Atualizações: no computador, o atualizador nativo (assinado) baixa e instala em silêncio;
// no celular, avisa quando há um APK novo na página de releases.
import { useSyncExternalStore } from 'react'
import changelog from '../CHANGELOG.md?raw'
import { isDesktopApp, isNative, openExternal } from './native'

export const VERSION: string = __APP_VERSION__
const REPO = 'oadrianrabelo/agregador-links'

type State = { phase: 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'available' | 'error'; version?: string; progress?: number }
let state: State = { phase: 'idle' }
const subs = new Set<() => void>()
const set = (s: State) => { state = s; subs.forEach((f) => f()) }
export const useUpdate = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)

const newer = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

export async function checkForUpdate(): Promise<State> {
  if (!isNative) { set({ phase: 'latest' }); return state }
  set({ phase: 'checking' })
  try {
    if (isDesktopApp) {
      const { check } = await import('@tauri-apps/plugin-updater')
      const upd = await check()
      if (!upd) { set({ phase: 'latest' }); return state }
      let total = 0, got = 0
      set({ phase: 'downloading', version: upd.version, progress: 0 })
      await upd.downloadAndInstall((ev) => {
        if (ev.event === 'Started') total = ev.data.contentLength ?? 0
        if (ev.event === 'Progress') { got += ev.data.chunkLength; set({ phase: 'downloading', version: upd.version, progress: total ? got / total : 0 }) }
      })
      set({ phase: 'ready', version: upd.version })
      return state
    }
    // celular: compara com a última release do GitHub
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    const tag = ((await r.json()).tag_name ?? '').replace(/^v/, '')
    set(tag && newer(tag, VERSION) ? { phase: 'available', version: tag } : { phase: 'latest' })
  } catch {
    set({ phase: 'error' })
  }
  return state
}

export async function applyUpdate() {
  if (state.phase === 'ready') {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    return relaunch()
  }
  if (state.phase === 'available') return openExternal(`https://github.com/${REPO}/releases/latest`)
}

/** Procura ao abrir e a cada 6 horas. */
export function startUpdater() {
  if (!isNative) return
  setTimeout(checkForUpdate, 8000)
  setInterval(checkForUpdate, 6 * 3600e3)
}

export interface Release { version: string; date?: string; body: string }
export function releases(): Release[] {
  return changelog.split(/^##? (?=\[?\d)/m).slice(1).map((sec) => {
    const [head, ...rest] = sec.split('\n')
    const version = head.match(/\[?(\d+\.\d+\.\d+)/)?.[1] ?? head.trim()
    const date = head.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1]
    const body = rest.join('\n').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s*\(([0-9a-f]{7,40})\)/g, '').trim()
    return { version, date, body }
  })
}

export function justUpdated(): Release | null {
  let last: string | null = null
  try { last = localStorage.getItem('rete:version'); localStorage.setItem('rete:version', VERSION) } catch {}
  if (!last || last === VERSION) return null
  return releases().find((r) => r.version === VERSION) ?? { version: VERSION, body: '' }
}
