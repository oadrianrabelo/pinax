// Sincronização entre aparelhos via Supabase (Postgres + login Google/e-mail + tempo real).
// Local-first: o app funciona 100% offline; a nuvem só reconcilia.
import { useSyncExternalStore } from 'react'
import { createClient, type RealtimeChannel, type User } from '@supabase/supabase-js'
import { store } from './model'
import { mergeRow, toRow, type Row } from './merge'
import { getPrefs, setPrefs } from './prefs'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = URL_ && KEY_ ? createClient(URL_, KEY_) : null

export interface SyncState {
  phase: 'off' | 'signed-out' | 'syncing' | 'ok' | 'offline' | 'error'
  user?: { id: string; email?: string; name?: string; avatar?: string }
  at?: number
  error?: string
}

let state: SyncState = { phase: supabase ? 'signed-out' : 'off' }
const subs = new Set<() => void>()
const set = (p: Partial<SyncState>) => { state = { ...state, ...p }; subs.forEach((f) => f()) }
export const useSync = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)

let onChange = () => {}
let uid: string | null = null
let channel: RealtimeChannel | null = null
let running = false, again = false
let timer: ReturnType<typeof setTimeout> | undefined

export function initSync(cb: () => void) {
  onChange = cb
  if (!supabase) return
  supabase.auth.getSession().then(({ data }) => handleUser(data.session?.user ?? null))
  supabase.auth.onAuthStateChange((_e, session) => { handleUser(session?.user ?? null) })
  addEventListener('online', () => syncNow())
  addEventListener('offline', () => set({ phase: 'offline' }))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  setInterval(() => syncNow(), 120_000)
}

async function handleUser(user: User | null) {
  if ((user?.id ?? null) === uid) return
  uid = user?.id ?? null
  channel?.unsubscribe(); channel = null
  if (!user) return set({ phase: 'signed-out', user: undefined })
  const meta = user.user_metadata ?? {}
  set({ user: { id: user.id, email: user.email, name: meta.full_name ?? meta.name, avatar: meta.avatar_url } })

  // primeira vez desta conta neste aparelho: o que já existe aqui precisa subir
  const seen = 'kairos:seen:' + user.id
  if (!localStorage.getItem(seen)) {
    for (const i of await store.raw()) await store.put({ ...i, dirty: true })
    localStorage.setItem(seen, '1')
  }

  channel = supabase!
    .channel('items-' + user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` }, async (payload) => {
      const row = payload.new as Row
      if (!row?.id) return
      const merged = mergeRow(await store.get(row.id), row)
      if (merged) { await store.put(merged); onChange() }
    })
    .subscribe()
  syncNow()
}

/** Agrupa mudanças locais em rajada numa única ida à nuvem. */
export function scheduleSync() {
  if (!uid) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, 1500)
}

export async function syncNow() {
  if (!supabase || !uid) return
  if (!navigator.onLine) return set({ phase: 'offline' })
  if (running) { again = true; return }
  running = true
  set({ phase: 'syncing' })
  try {
    const cursorKey = 'kairos:cursor:' + uid
    let cursor = localStorage.getItem(cursorKey) ?? '1970-01-01T00:00:00Z'
    let changed = false

    // 1. puxa o que mudou em outros aparelhos
    for (;;) {
      const { data, error } = await supabase.from('items').select('*').gt('server_ts', cursor).order('server_ts').limit(500)
      if (error) throw error
      for (const row of data as Row[]) {
        const merged = mergeRow(await store.get(row.id), row)
        if (merged) { await store.put(merged); changed = true }
      }
      if (data.length) cursor = (data[data.length - 1] as Row).server_ts
      if (data.length < 500) break
    }
    localStorage.setItem(cursorKey, cursor)

    // 2. empurra o que mudou aqui
    const dirty = (await store.raw()).filter((i) => i.dirty)
    if (dirty.length) {
      const { error } = await supabase.from('items').upsert(dirty.map(toRow))
      if (error) throw error
      for (const i of dirty) {
        const cur = await store.get(i.id)
        if (cur && cur.updatedAt === i.updatedAt) await store.put({ ...cur, dirty: false })
      }
    }

    // 3. aparência (fontes, cores...) também viaja
    const { data: pr, error: pe } = await supabase.from('prefs').select('data, updated_at').maybeSingle()
    if (pe) throw pe
    const local = getPrefs()
    if (pr && pr.updated_at > local.updatedAt) setPrefs({ ...pr.data, updatedAt: pr.updated_at }, { remote: true })
    else if (!pr || local.updatedAt > pr.updated_at) {
      const { error } = await supabase.from('prefs').upsert({ user_id: uid, data: local, updated_at: local.updatedAt })
      if (error) throw error
    }

    if (changed) onChange()
    set({ phase: 'ok', at: Date.now(), error: undefined })
  } catch (e: any) {
    set({ phase: 'error', error: e?.message ?? String(e) })
  } finally {
    running = false
    if (again) { again = false; syncNow() }
  }
}

export const signInGoogle = () => supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
export const signInEmail = (email: string) => supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
export const signOut = () => supabase!.auth.signOut()
