// Atualização automática do app instalado (PWA) + "o que há de novo".
import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'
import changelog from '../CHANGELOG.md?raw'

export const VERSION: string = __APP_VERSION__

let ready = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
export const useUpdateReady = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => ready)

let reg: ServiceWorkerRegistration | undefined
const updateSW = registerSW({
  immediate: true,
  // Nova versão baixada: se o app está em segundo plano, aplica na hora (você nem percebe);
  // se está na tela, mostra um aviso discreto e aplica quando você sair dele.
  onNeedRefresh() {
    if (document.visibilityState === 'hidden') updateSW(true)
    else { ready = true; emit() }
  },
  onRegisteredSW(_url, r) {
    reg = r
    if (!r) return
    setInterval(() => r.update(), 30 * 60e3)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') r.update()
      else if (ready) updateSW(true)
    })
  },
})
export const applyUpdate = () => updateSW(true)
export const checkForUpdate = async () => { await reg?.update(); return ready }

export interface Release { version: string; date?: string; body: string }
/** Lê o CHANGELOG.md gerado pelo release-please (embutido no build). */
export function releases(): Release[] {
  return changelog.split(/^## /m).slice(1).map((sec) => {
    const [head, ...rest] = sec.split('\n')
    const version = head.match(/\[?(\d+\.\d+\.\d+)/)?.[1] ?? head.trim()
    const date = head.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1]
    const body = rest.join('\n')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links → texto
      .replace(/\s*\(([0-9a-f]{7,40})\)/g, '')     // hashes de commit
      .trim()
    return { version, date, body }
  })
}

/** Se esta é a primeira abertura após uma atualização, devolve as notas dela. */
export function justUpdated(): Release | null {
  let last: string | null = null
  try { last = localStorage.getItem('kairos:version'); localStorage.setItem('kairos:version', VERSION) } catch {}
  if (!last || last === VERSION) return null
  return releases().find((r) => r.version === VERSION) ?? { version: VERSION, body: '' }
}
