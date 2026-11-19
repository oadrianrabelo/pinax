import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KINDS, REMINDERS, canon, downloadIcs, extractUrl, guessKind, hash, host, isDue, loadPreview, relative, store,
  type Item, type Kind,
} from './model'
import { usePrefs } from './prefs'
import { initSync, scheduleSync, useSync } from './sync'
import { applyUpdate, justUpdated, useUpdateReady, type Release } from './update'
import Atelier from './Atelier'
import { Notes, Scripts } from './bits'

type View = 'agora' | 'feitos'

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState<Kind | null>(null)
  const [view, setView] = useState<View>('agora')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [, tick] = useState(0)
  const [atelier, setAtelier] = useState(false)
  const [news, setNews] = useState<Release | null>(() => justUpdated())
  const prefs = usePrefs()
  const sync = useSync()
  const updateReady = useUpdateReady()
  const itemsRef = useRef(items)
  itemsRef.current = items

  const say = useCallback((t: string) => { setToast(t); setTimeout(() => setToast((c) => (c === t ? null : c)), 2600) }, [])

  const save = useCallback(async (raw: Item) => {
    const i = store.touch(raw)
    setItems((xs) => {
      const rest = xs.filter((x) => x.id !== i.id)
      return (i.deletedAt ? rest : [i, ...rest]).sort((a, b) => b.createdAt - a.createdAt)
    })
    await store.put(i)
    scheduleSync()
  }, [])

  const patch = useCallback((id: string, p: Partial<Item>) => {
    const cur = itemsRef.current.find((x) => x.id === id)
    if (cur) save({ ...cur, ...p })
  }, [save])

  const add = useCallback(async (raw: string, note?: string) => {
    const url = extractUrl(raw)
    if (!url) return say('Isso não parece um link.')
    const dup = itemsRef.current.find((x) => canon(x.url) === canon(url))
    if (dup) { setOpen(dup.id); return say('Esse já estava guardado.') }
    const item: Item = { id: crypto.randomUUID(), url, kind: guessKind(url), createdAt: Date.now(), note, loading: true }
    await save(item)
    say(`${KINDS[item.kind].sigil}  guardado`)
    const p = await loadPreview(url)
    const latest = itemsRef.current.find((x) => x.id === item.id) ?? item
    const kind = latest.kind === item.kind ? guessKind(url, p.type, p.price) : latest.kind
    const { type: _t, ...meta } = p
    await save({ ...latest, ...meta, kind, loading: false })
  }, [save, say])

  const remove = useCallback((id: string) => { patch(id, { deletedAt: Date.now() }); setOpen(null); say('Esquecido.') }, [patch, say])

  // carregar + receber links compartilhados (share target / bookmarklet)
  useEffect(() => {
    store.all().then((xs) => { setItems(xs); setReady(true)
      const q = new URLSearchParams(location.search)
      const shared = extractUrl(q.get('url')) ?? extractUrl(q.get('text')) ?? extractUrl(q.get('title'))
      if (shared) { history.replaceState(null, '', '/'); add(shared) }
      xs.filter((x) => x.loading).forEach((x) => loadPreview(x.url).then(({ type: _t, ...m }) => save({ ...x, ...m, loading: false })))
    })
    initSync(() => store.all().then(setItems))
  }, []) // eslint-disable-line

  // aparência mudou → sobe pra nuvem também
  useEffect(() => { if (prefs.updatedAt) scheduleSync() }, [prefs.updatedAt])

  // colar em qualquer lugar / arrastar link pra janela
  useEffect(() => {
    const typing = (e: Event) => (e.target as HTMLElement)?.closest?.('input, textarea')
    const onPaste = (e: ClipboardEvent) => { if (!typing(e)) { const u = extractUrl(e.clipboardData?.getData('text')); if (u) { e.preventDefault(); add(u) } } }
    const onDrop = (e: DragEvent) => { e.preventDefault(); const u = extractUrl(e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text')); if (u) add(u) }
    const onOver = (e: DragEvent) => e.preventDefault()
    addEventListener('paste', onPaste); addEventListener('drop', onDrop); addEventListener('dragover', onOver)
    return () => { removeEventListener('paste', onPaste); removeEventListener('drop', onDrop); removeEventListener('dragover', onOver) }
  }, [add])

  // relógio dos lembretes: avisa quando chega o kairós
  useEffect(() => {
    const check = () => {
      tick((n) => n + 1)
      for (const i of itemsRef.current) {
        if (isDue(i) && !i.notifiedAt) {
          patch(i.id, { notifiedAt: Date.now() })
          if ('Notification' in window && Notification.permission === 'granted')
            navigator.serviceWorker?.ready.then((r) => r.showNotification('Chegou o kairós ' + KINDS[i.kind].sigil, { body: i.title || host(i.url), icon: '/icon-192.png', tag: i.id, data: { url: i.url } }))
        }
      }
    }
    const t = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check) }
  }, [patch])

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter((i) => (view === 'agora' ? !i.doneAt : !!i.doneAt) && (!filter || i.kind === filter) &&
      (!q || [i.title, i.description, i.url, i.note, i.site].some((s) => s?.toLowerCase().includes(q))))
      .sort((a, b) => Number(isDue(b)) - Number(isDue(a)) || b.createdAt - a.createdAt)
  }, [items, filter, view, query])

  const pending = items.filter((i) => !i.doneAt)
  const counts = useMemo(() => Object.fromEntries((Object.keys(KINDS) as Kind[]).map((k) => [k, pending.filter((i) => i.kind === k).length])), [pending])
  const current = items.find((i) => i.id === open) ?? null

  return (
    <>
      <div className="grain" aria-hidden />
      <header className="top">
        <div className="brand">
          <h1>{prefs.title || 'Kairos'}</h1>
          {prefs.subtitle && <p className="greek"><Scripts text={prefs.subtitle} /></p>}
          <p className="lede">
            {pending.length === 0 ? 'Nada guardado ainda. Cole um link em qualquer lugar.' :
              <>Você guarda <b>{pending.length}</b> {pending.length === 1 ? 'coisa' : 'coisas'} esperando a hora certa{pending.some(isDue) && <> — <span className="due-text">{pending.filter(isDue).length} {pending.filter(isDue).length === 1 ? 'chegou' : 'chegaram'}</span></>}.</>}
          </p>
        </div>
        {prefs.astrolabe && <Astrolabe items={pending} onPick={setOpen} />}
      </header>

      {ready && prefs.oracle && pending.length > 0 && <Oracle items={pending} onOpen={setOpen} onDone={(id) => patch(id, { doneAt: Date.now() })} />}

      <nav className="sigils" aria-label="Categorias">
        <button className={!filter ? 'on' : ''} onClick={() => setFilter(null)}><span>∗</span>Tudo</button>
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(filter === k ? null : k)} title={`${KINDS[k].word} — ${KINDS[k].meaning}`}>
            <span>{KINDS[k].sigil}</span>{KINDS[k].label}{counts[k] > 0 && <i>{counts[k]}</i>}
          </button>
        ))}
        <div className="spacer" />
        <input className="search" placeholder="procurar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className={'view ' + (view === 'feitos' ? 'on' : '')} onClick={() => setView(view === 'agora' ? 'feitos' : 'agora')}>
          {view === 'agora' ? '✓ consumidos' : '← voltar'}
        </button>
      </nav>

      <main className="mural">
        {visible.map((i) => <Card key={i.id} item={i} onClick={() => setOpen(i.id)} />)}
        {ready && visible.length === 0 && (
          <div className="empty">
            <span>{filter ? KINDS[filter].sigil : view === 'feitos' ? '✓' : '∅'}</span>
            <p>{view === 'feitos' ? 'Nada consumido ainda.' : query ? 'Nada encontrado.' : 'Cole, arraste ou compartilhe um link pra cá.'}</p>
          </div>
        )}
      </main>

      <AddBar onAdd={add} />
      <button className={'gear ' + sync.phase} onClick={() => setAtelier(true)} aria-label="Abrir o Ateliê" title="Ateliê">
        {sync.user?.avatar ? <img src={sync.user.avatar} alt="" referrerPolicy="no-referrer" /> : '☉'}
      </button>
      {atelier && <Atelier items={items} onClose={() => setAtelier(false)} onImport={async (xs) => {
        for (const x of xs) await store.put(store.touch(x))
        setItems(await store.all()); scheduleSync(); say(`${xs.length} itens importados`)
      }} />}
      {current && <Sheet item={current} hour={prefs.reminderHour} onClose={() => setOpen(null)} patch={(p) => patch(current.id, p)} remove={() => remove(current.id)} say={say} />}
      {updateReady && <button className="update-pill" onClick={applyUpdate}>✦ nova versão pronta — atualizar</button>}
      {news && (
        <div className="scrim center" onClick={() => setNews(null)}>
          <div className="news" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">atualizado</p>
            <h2>Versão {news.version}</h2>
            <Notes body={news.body || 'Melhorias e correções.'} />
            <button className="btn gold" onClick={() => setNews(null)}>que bom</button>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

// ——— Astrolábio: cada lembrete é um astro; quanto mais perto do centro, mais perto do momento ———
function Astrolabe({ items, onPick }: { items: Item[]; onPick: (id: string) => void }) {
  const R = 120
  const stars = items.filter((i) => i.remindAt).map((i) => {
    const days = Math.max(0, (i.remindAt! - Date.now()) / 864e5)
    const r = isDue(i) ? 0 : 22 + Math.min(1, Math.log1p(days) / Math.log1p(30)) * (R - 30)
    const a = (hash(i.id) % 360) * (Math.PI / 180)
    return { i, x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
  return (
    <svg className="astrolabe" viewBox="-130 -130 260 260" role="img" aria-label="Astrolábio de lembretes">
      <g className="rings">
        {[R, 92, 64, 36].map((r) => <circle key={r} r={r} />)}
        <g className="spin">
          {Array.from({ length: 72 }, (_, k) => {
            const a = (k * 5 * Math.PI) / 180, l = k % 6 === 0 ? 8 : 3
            return <line key={k} x1={Math.cos(a) * R} y1={Math.sin(a) * R} x2={Math.cos(a) * (R - l)} y2={Math.sin(a) * (R - l)} />
          })}
          {'ΑΒΓΔΕΖΗΘΙΚΛΜ'.split('').map((g, k) => {
            const a = (k * 30 * Math.PI) / 180 - Math.PI / 2
            return <text key={g} x={Math.cos(a) * 104} y={Math.sin(a) * 104 + 3}>{g}</text>
          })}
        </g>
        <path d="M0 -120 V120 M-120 0 H120" className="cross" />
      </g>
      <circle r="6" className="sun" />
      {stars.map(({ i, x, y }) => (
        <g key={i.id} className={'star ' + (isDue(i) ? 'due' : '')} transform={`translate(${x} ${y})`} onClick={() => onPick(i.id)}>
          <circle r="11" className="halo" /><circle r="3.5" />
          <title>{(i.title || host(i.url)) + ' — ' + relative(i.remindAt!)}</title>
        </g>
      ))}
    </svg>
  )
}

// ——— Oráculo: a cada abertura, uma carta diferente ———
function Oracle({ items, onOpen, onDone }: { items: Item[]; onOpen: (id: string) => void; onDone: (id: string) => void }) {
  const pick = useCallback((exclude?: string) => {
    const due = items.filter(isDue)
    const pool = (due.length ? due : items).filter((i) => i.id !== exclude)
    const p = pool.length ? pool : items
    // itens mais antigos pesam mais: quem espera há mais tempo tem mais chance de ser lembrado
    const w = p.map((i) => 1 + Math.sqrt((Date.now() - i.createdAt) / 864e5))
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    return p.find((_, k) => (r -= w[k]) <= 0) ?? p[0]
  }, [items])
  const [id, setId] = useState<string>(() => { let last: string | undefined; try { last = localStorage.getItem('kairos:last') ?? undefined } catch {} return pick(last).id })
  const [flipped, setFlipped] = useState(false)
  const item = items.find((i) => i.id === id) ?? items[0]
  useEffect(() => { try { localStorage.setItem('kairos:last', item.id) } catch {} }, [item.id])
  useEffect(() => { const t = setTimeout(() => setFlipped(true), 450); return () => clearTimeout(t) }, [id])
  const next = () => { setFlipped(false); setTimeout(() => setId(pick(item.id).id), 420) }
  const k = KINDS[item.kind]
  return (
    <section className="oracle">
      <div className="oracle-copy">
        <p className="eyebrow">{isDue(item) ? 'chegou o kairós' : 'a carta de agora'}</p>
        <h2>{isDue(item) ? 'Você pediu pra lembrar disto.' : 'Talvez seja a hora disto.'}</h2>
        <p className="muted">Toda vez que você abre, o oráculo tira uma carta do que está esperando.</p>
        <div className="row">
          <a className="btn gold" href={item.url} target="_blank" rel="noreferrer">abrir ↗</a>
          <button className="btn" onClick={next}>outra carta</button>
          <button className="btn ghost" onClick={() => { onDone(item.id); next() }}>✓ já fiz</button>
        </div>
      </div>
      <div className={'tarot ' + (flipped ? 'flipped' : '')} onClick={() => (flipped ? onOpen(item.id) : setFlipped(true))}>
        <div className="face back"><div className="back-art"><span>καιρός</span></div></div>
        <div className="face front">
          <div className="tarot-img" style={art(item)}>{item.image ? <img src={item.image} alt="" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <b>{k.sigil}</b>}</div>
          <div className="tarot-body">
            <span className="roman">{k.sigil} · {k.word}</span>
            <h3>{item.title || host(item.url)}</h3>
            <span className="mono">{host(item.url)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// Arte generativa: cada domínio tem sua paleta, quando não há imagem
function art(i: Item): React.CSSProperties {
  const h = hash(host(i.url)), a = h % 360, b = (a + 40 + (h >> 8) % 80) % 360
  return { background: `radial-gradient(120% 90% at ${20 + (h % 60)}% 10%, hsl(${a} 70% 62%), transparent 60%), radial-gradient(100% 100% at 90% 100%, hsl(${b} 60% 40%), hsl(${a} 30% 12%))` }
}

function Card({ item: i, onClick }: { item: Item; onClick: () => void }) {
  const k = KINDS[i.kind]
  const tilt = ((hash(i.id) % 7) - 3) * 0.45
  const [broken, setBroken] = useState(false)
  return (
    <article className={'card ' + (isDue(i) ? 'due ' : '') + (i.loading ? 'loading' : '')} style={{ '--tilt': `${tilt}deg` } as React.CSSProperties} onClick={onClick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="thumb" style={art(i)}>
        {i.image && !broken ? <img src={i.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <b>{k.sigil}</b>}
        <span className="sigil" title={k.word}>{k.sigil}</span>
        {i.price && <span className="price">{i.price}</span>}
      </div>
      <div className="body">
        <h3>{i.loading ? <span className="shimmer">lendo o link…</span> : i.title || host(i.url)}</h3>
        {i.note && <p className="note">“{i.note}”</p>}
        <footer>
          {i.favicon && <img className="fav" src={i.favicon} alt="" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />}
          <span className="mono">{i.site || host(i.url)}</span>
          {i.remindAt && !i.doneAt && <span className={'when ' + (isDue(i) ? 'now' : '')}>☾ {relative(i.remindAt)}</span>}
        </footer>
      </div>
    </article>
  )
}

function AddBar({ onAdd }: { onAdd: (url: string, note?: string) => void }) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !(e.target as HTMLElement).closest('input,textarea')) { e.preventDefault(); ref.current?.focus() } }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  const fromClipboard = async () => {
    try { const t = await navigator.clipboard.readText(); if (extractUrl(t)) { onAdd(t); return } } catch {}
    ref.current?.focus()
  }
  return (
    <form className="addbar" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v); setV('') } }}>
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)} placeholder="cole um link — ou só aperte Ctrl+V em qualquer lugar" inputMode="url" enterKeyHint="done" />
      {v ? <button className="plus" type="submit" aria-label="Guardar">↵</button>
        : <button className="plus" type="button" onClick={fromClipboard} aria-label="Colar da área de transferência">+</button>}
    </form>
  )
}

function Sheet({ item: i, hour, onClose, patch, remove, say }: { item: Item; hour: number; onClose: () => void; patch: (p: Partial<Item>) => void; remove: () => void; say: (t: string) => void }) {
  const [note, setNote] = useState(i.note ?? '')
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const remind = async (when: number) => {
    patch({ remindAt: when, notifiedAt: undefined })
    say('☾ lembro ' + relative(when))
    if ('Notification' in window && Notification.permission === 'default') try { await Notification.requestPermission() } catch {}
  }
  const local = (ms?: number) => { if (!ms) return ''; const d = new Date(ms - new Date().getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16) }
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={i.title || i.url}>
        <div className="grip" />
        <div className="sheet-img" style={art(i)}>{i.image ? <img src={i.image} alt="" referrerPolicy="no-referrer" /> : <b>{KINDS[i.kind].sigil}</b>}</div>
        <div className="sheet-body">
          <span className="mono">{i.site || host(i.url)}{i.price && ' · ' + i.price}</span>
          <h2>{i.title || host(i.url)}</h2>
          {i.description && <p className="desc">{i.description}</p>}
          <a className="btn gold wide" href={i.url} target="_blank" rel="noreferrer">abrir o link ↗</a>

          <h4>o que é</h4>
          <div className="chips">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <button key={k} className={i.kind === k ? 'on' : ''} onClick={() => patch({ kind: k })}><span>{KINDS[k].sigil}</span>{KINDS[k].label}</button>
            ))}
          </div>

          <h4>me lembre {i.remindAt && !i.doneAt && <em>— {relative(i.remindAt)}</em>}</h4>
          <div className="chips">
            {REMINDERS.map((r) => <button key={r.label} onClick={() => remind(r.when(hour))}>{r.label}</button>)}
            <input type="datetime-local" value={local(i.remindAt)} onChange={(e) => e.target.value && remind(new Date(e.target.value).getTime())} />
            {i.remindAt && <button onClick={() => patch({ remindAt: undefined })}>✕ sem lembrete</button>}
          </div>
          {i.remindAt && <button className="link" onClick={() => downloadIcs(i)}>＋ pôr no calendário do celular/PC (toca mesmo com o app fechado)</button>}

          <h4>nota</h4>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (i.note ?? '') && patch({ note })} placeholder="por que guardei isso?" rows={2} />

          <div className="row end">
            <button className="btn ghost danger" onClick={() => confirm('Esquecer este link?') && remove()}>esquecer</button>
            {i.doneAt ? <button className="btn" onClick={() => patch({ doneAt: undefined })}>↺ voltar pra fila</button>
              : <button className="btn" onClick={() => { patch({ doneAt: Date.now() }); onClose(); say('✓ consumido') }}>✓ já consumi</button>}
          </div>
        </div>
      </aside>
    </div>
  )
}
