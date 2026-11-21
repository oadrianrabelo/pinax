// Ponte com o sistema (Tauri). No navegador (desenvolvimento), cai em equivalentes web.
import { parseHtml, type Preview } from './preview'

export const isNative = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
export const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
export const isDesktopApp = isNative && !isMobile

/** Abre no navegador do sistema. */
export async function openExternal(url: string) {
  if (isNative) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    return openUrl(url)
  }
  window.open(url, '_blank', 'noopener')
}

/** Todo <a href="http..."> abre fora do app. */
export function captureLinks() {
  if (!isNative) return
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="http"]') as HTMLAnchorElement | null
    if (a) { e.preventDefault(); openExternal(a.href) }
  })
}

/** Prévia do link: no app nativo, busca o HTML direto (sem servidor e sem CORS). */
export async function fetchPreview(url: string): Promise<Preview | null> {
  try {
    if (isNative) {
      const { fetch } = await import('@tauri-apps/plugin-http')
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; RetePreview/1.0)', 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8', accept: 'text/html' },
        connectTimeout: 8000,
      })
      if (!res.ok) return null
      if (!/html/i.test(res.headers.get('content-type') ?? '')) return { site: new URL(url).hostname }
      return parseHtml((await res.text()).slice(0, 800_000), new URL(res.url || url))
    }
    const r = await fetch('/api/preview?url=' + encodeURIComponent(url))
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

// ——— notificações ———
let permitted: boolean | null = null
export async function ensureNotifyPermission() {
  if (permitted !== null) return permitted
  if (isNative) {
    const n = await import('@tauri-apps/plugin-notification')
    permitted = (await n.isPermissionGranted()) || (await n.requestPermission()) === 'granted'
  } else if ('Notification' in window) {
    permitted = Notification.permission === 'granted' || (await Notification.requestPermission()) === 'granted'
  } else permitted = false
  return permitted
}

export async function notify(title: string, body: string) {
  if (!(await ensureNotifyPermission())) return
  if (isNative) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification')
    sendNotification({ title, body })
  } else new Notification(title, { body, icon: '/icon.svg' })
}

const nid = (id: string) => { let h = 7; for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return Math.abs(h) || 1 }

/**
 * No celular, o próprio sistema agenda o alarme — toca mesmo com o app fechado.
 * No computador, o Pinax fica na bandeja e dispara na hora (ver laço em App.tsx).
 */
export async function scheduleReminder(id: string, at: number | undefined, title: string, body: string) {
  if (!isNative || !isMobile) return
  const n = await import('@tauri-apps/plugin-notification')
  try { await n.cancel([nid(id)]) } catch {}
  if (!at || at <= Date.now()) return
  if (!(await ensureNotifyPermission())) return
  n.sendNotification({ id: nid(id), title, body, schedule: n.Schedule.at(new Date(at), false, true) })
}

// ——— área de transferência ———
export async function readClipboard(): Promise<string | null> {
  try {
    if (isNative) { const { readText } = await import('@tauri-apps/plugin-clipboard-manager'); return await readText() }
    return await navigator.clipboard.readText()
  } catch { return null }
}

// ——— links profundos (pinax://auth?code=...) ———
export async function onDeepLink(cb: (url: string) => void) {
  if (!isNative) return
  const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link')
  const first = await getCurrent().catch(() => null)
  first?.forEach(cb)
  await onOpenUrl((urls) => urls.forEach(cb))
}

// ——— iniciar com o sistema ———
export async function getAutostart() {
  if (!isDesktopApp) return null
  const { isEnabled } = await import('@tauri-apps/plugin-autostart')
  return isEnabled()
}
export async function setAutostart(on: boolean) {
  if (!isDesktopApp) return
  const a = await import('@tauri-apps/plugin-autostart')
  return on ? a.enable() : a.disable()
}

// ——— "Compartilhar" do Android (ver src-tauri/android/ReteShare.kt) ———
export type Shared =
  | { type: 'text'; text: string; subject?: string }
  | { type: 'file'; path: string; mime: string; name: string; size: number; thumb: string | null; text?: string }

type Bridge = { take(): string; open(path: string): void; remove(path: string): void; insets?(): string; bars?(dark: boolean): void }
const bridge = () => (window as unknown as { ReteShare?: Bridge }).ReteShare

/** Entrega o que outros apps compartilharam com o Pinax — ao abrir e sempre que chegar algo novo. */
export function onShare(cb: (items: Shared[]) => void) {
  const take = () => {
    const b = bridge()
    if (!b) return
    try { const xs = JSON.parse(b.take()) as Shared[]; if (xs.length) cb(xs) } catch {}
  }
  window.addEventListener('rete-share', take)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') take() })
  take()
}

/** Abre uma foto/vídeo/arquivo guardado com o app do sistema. */
export const openMedia = (path: string) => bridge()?.open(path)
/** Apaga o arquivo de um item esquecido. */
export const removeMedia = (path: string) => bridge()?.remove(path)

/** Abre um item: link no navegador, arquivo no app do sistema. */
export function openItem(i: { url: string; media?: { path: string } }) {
  if (i.media) return openMedia(i.media.path)
  return openExternal(i.url)
}

/** Reserva o espaço das barras do sistema (o Android desenha o app por baixo delas). */
export function watchSystemBars() {
  const apply = () => {
    const b = bridge()
    if (!b?.insets) return
    try {
      const i = JSON.parse(b.insets()) as { top?: number; bottom?: number; left?: number; right?: number }
      const s = document.documentElement.style
      if (i.top != null) s.setProperty('--sat', i.top + 'px')
      if (i.bottom != null) s.setProperty('--sab', i.bottom + 'px')
      if (i.left != null) s.setProperty('--sal', i.left + 'px')
      if (i.right != null) s.setProperty('--sar', i.right + 'px')
    } catch {}
  }
  window.addEventListener('rete-insets', apply)
  apply()
}
