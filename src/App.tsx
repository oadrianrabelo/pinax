import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KINDS, REMINDERS, canon, downloadIcs, extractUrl, guessKind, hash, host, isDue, loadPreview, relative, store,
  type Item, type Kind,
} from './model'
import { ERAS, usePrefs } from './prefs'
import { initSync, scheduleSync, useSync } from './sync'
import { applyUpdate, justUpdated, startUpdater, useUpdate, type Release } from './update'
import { captureLinks, getAutostart, isDesktopApp, isMobile, isNative, notify, onDeepLink, readClipboard, scheduleReminder, setAutostart } from './native'
import { Spell, greekNumeral } from './spell'
import { Choice, Notes, Scripts, Seal } from './bits'
import Atelier from './Atelier'

type View = 'agora' | 'feitos'
const KIND_IDS = Object.keys(KINDS) as Kind[]

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState<Kind | null>(null)
  const [view, setView] = useState<View>('agora')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [offer, setOffer] = useState<string | null>(null)
  const [atelier, setAtelier] = useState(false)
  const [news, setNews] = useState<Release | null>(() => justUpdated())
  const [, tick] = useState(0)
  const prefs = usePrefs()
  const sync = useSync()
  const upd = useUpdate()
  const itemsRef = useRef(items)
  itemsRef.current = items
  const era = ERAS[prefs.era]

  const pickFilter = useCallback((k: Kind | null) => { setFilter(k); setView('agora') }, [])
  const say = useCallback((t: string) => { setToast(t); setTimeout(() => setToast((c) => (c === t ? null : c)), 2800) }, [])

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
    if (!cur) return
    const next = { ...cur, ...p }
    save(next)
    if ('remindAt' in p || 'doneAt' in p || 'deletedAt' in p)
      scheduleReminder(id, next.doneAt || next.deletedAt ? undefined : next.remindAt, 'Chegou a hora ' + KINDS[next.kind].sigil, next.title || host(next.url))
  }, [save])

  const add = useCallback(async (raw: string, note?: string) => {
    const url = extractUrl(raw)
    if (!url) return say('Isso não parece um link.')
    const dup = itemsRef.current.find((x) => canon(x.url) === canon(url))
    if (dup) { setOpen(dup.id); return say('Esse já estava na rede.') }
    const item: Item = { id: crypto.randomUUID(), url, kind: guessKind(url), createdAt: Date.now(), note, loading: true }
    await save(item)
    say(`${KINDS[item.kind].sigil} · uma estrela nova na rede`)
    const p = await loadPreview(url)
    const latest = itemsRef.current.find((x) => x.id === item.id) ?? item
    const kind = latest.kind === item.kind ? guessKind(url, p.type, p.price) : latest.kind
    const { type: _t, ...meta } = p
    await save({ ...latest, ...meta, kind, loading: false })
  }, [save, say])

  const remove = useCallback((id: string) => { patch(id, { deletedAt: Date.now() }); setOpen(null); say('Esquecido.') }, [patch, say])

  // começo: banco local, links compartilhados, nuvem, atualizações
  useEffect(() => {
    captureLinks()
    store.all().then((xs) => {
      setItems(xs); setReady(true)
      const q = new URLSearchParams(location.search)
      const shared = extractUrl(q.get('url')) ?? extractUrl(q.get('text')) ?? extractUrl(q.get('title'))
      if (shared) { history.replaceState(null, '', '/'); add(shared) }
      xs.filter((x) => x.loading).forEach((x) => loadPreview(x.url).then(({ type: _t, ...m }) => save({ ...x, ...m, loading: false })))
      // no celular, garante que todos os alarmes futuros estão agendados no sistema
      if (isMobile) xs.filter((x) => x.remindAt && !x.doneAt && x.remindAt > Date.now())
        .forEach((x) => scheduleReminder(x.id, x.remindAt, 'Chegou a hora ' + KINDS[x.kind].sigil, x.title || host(x.url)))
    })
    initSync(() => store.all().then(setItems))
    startUpdater()
    // rete://add?url=...  (o favorito do navegador manda links direto pro app)
    onDeepLink((u) => { const url = new URL(u); if (url.host === 'add') { const l = url.searchParams.get('url'); if (l) add(l) } })
    // na primeira vez no computador, liga "abrir com o sistema" — é o que faz os lembretes tocarem
    if (isDesktopApp && !localStorage.getItem('rete:autostart-asked')) {
      localStorage.setItem('rete:autostart-asked', '1')
      getAutostart().then((on) => { if (on === false) setAutostart(true) })
    }
  }, []) // eslint-disable-line

  useEffect(() => { if (prefs.updatedAt) scheduleSync() }, [prefs.updatedAt])

  // Botão voltar (Android): fecha uma camada por vez; na tela inicial, toque duas vezes para sair
  const ui = useRef({ news, open, atelier, offer, searching, query, filter, view })
  ui.current = { news, open, atelier, offer, searching, query, filter, view }
  useEffect(() => {
    if (!isNative || !isMobile) return
    let lastBack = 0
    let off: { unregister: () => Promise<void> } | undefined
    import('@tauri-apps/api/app').then(({ onBackButtonPress }) => onBackButtonPress(async () => {
      const u = ui.current
      if (u.news) return setNews(null)
      if (u.open) return setOpen(null)
      if (u.atelier) return setAtelier(false)
      if (u.offer) return setOffer(null)
      if (u.searching || u.query) { setQuery(''); setSearching(false); return }
      if (u.filter || u.view !== 'agora') { setFilter(null); setView('agora'); return }
      if (scrollY > 200) { scrollTo({ top: 0, behavior: 'smooth' }); return }
      if (Date.now() - lastBack < 2000) { const { exit } = await import('@tauri-apps/plugin-process'); return exit(0) }
      lastBack = Date.now()
      say('Toque de novo em voltar para sair')
    })).then((l) => { off = l })
    return () => { off?.unregister() }
  }, [say])

  // colar em qualquer lugar / arrastar link pra janela
  useEffect(() => {
    const typing = (e: Event) => (e.target as HTMLElement)?.closest?.('input, textarea')
    const onPaste = (e: ClipboardEvent) => { if (!typing(e)) { const u = extractUrl(e.clipboardData?.getData('text')); if (u) { e.preventDefault(); add(u) } } }
    const onDrop = (e: DragEvent) => { e.preventDefault(); const u = extractUrl(e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text')); if (u) add(u) }
    const onOver = (e: DragEvent) => e.preventDefault()
    addEventListener('paste', onPaste); addEventListener('drop', onDrop); addEventListener('dragover', onOver)
    return () => { removeEventListener('paste', onPaste); removeEventListener('drop', onDrop); removeEventListener('dragover', onOver) }
  }, [add])

  // copiou um link em outro app? ao voltar, o Rete oferece guardar
  useEffect(() => {
    if (!isNative) return
    const look = async () => {
      if (document.visibilityState !== 'visible') return
      const u = extractUrl(await readClipboard())
      if (!u || itemsRef.current.some((x) => canon(x.url) === canon(u))) return
      if (localStorage.getItem('rete:offered') === canon(u)) return
      localStorage.setItem('rete:offered', canon(u))
      setOffer(u)
    }
    look()
    document.addEventListener('visibilitychange', look); addEventListener('focus', look)
    return () => { document.removeEventListener('visibilitychange', look); removeEventListener('focus', look) }
  }, [])

  // relógio dos lembretes (no computador, roda até com a janela fechada, na bandeja)
  useEffect(() => {
    const check = () => {
      tick((n) => n + 1)
      for (const i of itemsRef.current) {
        if (isDue(i) && !i.notifiedAt) {
          patch(i.id, { notifiedAt: Date.now() })
          if (!isMobile) notify('Chegou a hora ' + KINDS[i.kind].sigil, i.title || host(i.url))
        }
      }
    }
    const t = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check) }
  }, [patch])

  const order = useMemo(() => {
    const m = new Map<string, number>()
    ;[...items].sort((a, b) => a.createdAt - b.createdAt).forEach((x, i) => m.set(x.id, i + 1))
    return m
  }, [items])

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter((i) => (view === 'agora' ? !i.doneAt : !!i.doneAt) && (!filter || i.kind === filter) &&
      (!q || [i.title, i.description, i.url, i.note, i.site].some((s) => s?.toLowerCase().includes(q))))
      .sort((a, b) => Number(isDue(b)) - Number(isDue(a)) || b.createdAt - a.createdAt)
  }, [items, filter, view, query])

  const pending = useMemo(() => items.filter((i) => !i.doneAt), [items])
  const due = pending.filter(isDue)
  const counts = useMemo(() => Object.fromEntries(KIND_IDS.map((k) => [k, pending.filter((i) => i.kind === k).length])), [pending])
  const current = items.find((i) => i.id === open) ?? null
  const heading = view === 'feitos' ? 'Consumidos' : filter ? KINDS[filter].label : 'Tudo o que espera'

  return (
    <>
      <div className="grain" aria-hidden />
      <header className="masthead">
        <div className="title-block">
          <p className="era-line">
            <button className="ink" onClick={() => setAtelier(true)} title="Trocar de era">
              {era ? <>era · {era.name} · {era.year}</> : 'era · do acaso'}
            </button>
          </p>
          <Spell as="h1" text={prefs.title || 'Rete'} replayOnHover />
          {prefs.subtitle && <p className="subtitle"><Scripts text={prefs.subtitle} /></p>}
          <p className="lede">
            {pending.length === 0 ? <>A rede está vazia. Cole um link em qualquer lugar e ele vira uma estrela.</> : <>
              <b>{pending.length}</b> <span className="num" title="em numeral grego">{greekNumeral(pending.length)}</span> {pending.length === 1 ? 'estrela espera' : 'estrelas esperam'} a hora certa
              {due.length > 0 && <>; <em className="due-text">{due.length === 1 ? 'uma já chegou' : `${due.length} já chegaram`}</em></>}.
            </>}
          </p>
        </div>
        {prefs.astrolabe && (
          <Astrolabe items={pending} filter={filter} counts={counts} dueCount={due.length}
            onFilter={pickFilter} onPick={setOpen} />
        )}
      </header>

      {ready && prefs.oracle && view === 'agora' && pending.length > 0 && (
        <Oracle items={pending} onOpen={setOpen} onDone={(id) => patch(id, { doneAt: Date.now() })} />
      )}

      <section className="catalogue">
        <div className="catalogue-head">
          <Spell as="h2" text={heading} key={heading} speed={0.7} />
          <p className="index">
            <button className={'ink ' + (!filter && view === 'agora' ? 'on' : '')} onClick={() => { setFilter(null); setView('agora') }}>tudo</button>
            {KIND_IDS.map((k) => (
              <button key={k} className={'ink ' + (filter === k ? 'on' : '')} onClick={() => { setFilter(filter === k ? null : k); setView('agora') }} title={`${KINDS[k].word} — ${KINDS[k].meaning}`}>
                <span className="script">{KINDS[k].sigil}</span> {KINDS[k].label.toLowerCase()}{counts[k] > 0 && <sup>{counts[k]}</sup>}
              </button>
            ))}
            <span className="dot">·</span>
            <button className={'ink ' + (view === 'feitos' ? 'on' : '')} onClick={() => setView(view === 'feitos' ? 'agora' : 'feitos')}>consumidos</button>
            <span className="dot">·</span>
            {searching || query
              ? <input autoFocus className="find" value={query} onChange={(e) => setQuery(e.target.value)} onBlur={() => setSearching(false)} placeholder="procurar…" />
              : <button className="ink" onClick={() => setSearching(true)}>procurar</button>}
          </p>
        </div>

        <div className="mural">
          {visible.map((i) => <Leaf key={i.id} item={i} n={order.get(i.id) ?? 0} onOpen={setOpen} />)}
          {ready && visible.length === 0 && (
            <div className="empty">
              <span className="script">{filter ? KINDS[filter].sigil : view === 'feitos' ? '✓' : '∅'}</span>
              <p>{view === 'feitos' ? 'Nada consumido ainda.' : query ? 'Nenhuma estrela com esse nome.' : 'Cole, arraste ou copie um link e volte aqui.'}</p>
            </div>
          )}
        </div>
      </section>

      <Quill onAdd={add} />

      <button className={'astro-btn ' + sync.phase} onClick={() => setAtelier(true)} aria-label="Abrir o Ateliê" title="Ateliê">
        {sync.user?.avatar ? <img src={sync.user.avatar} alt="" referrerPolicy="no-referrer" /> : (
          <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden className="mini-astro">
            <circle r="10" /><circle r="6.5" cy="-1.5" /><path d="M0 -10 V10 M-10 0 H10" /><path d="M-7 7 L7 -7" className="hand" />
          </svg>
        )}
      </button>

      {atelier && <Atelier items={items} onClose={() => setAtelier(false)} onImport={async (xs) => {
        for (const x of xs) await store.put(store.touch(x))
        setItems(await store.all()); scheduleSync(); say(`${xs.length} itens importados`)
      }} />}
      {current && <Ficha item={current} hour={prefs.reminderHour} onClose={() => setOpen(null)} patch={(p) => patch(current.id, p)} remove={() => remove(current.id)} say={say} />}

      {(upd.phase === 'ready' || upd.phase === 'available') && (
        <button className="ribbon" onClick={applyUpdate}>
          {upd.phase === 'ready' ? <>versão {upd.version} pronta — <u>reiniciar</u></> : <>versão {upd.version} disponível — <u>baixar</u></>}
        </button>
      )}
      {offer && (
        <div className="slip offer" role="dialog">
          <p>Você copiou <b>{host(offer)}</b>. Guardar na rede?</p>
          <div className="row">
            <Seal small onClick={() => { add(offer); setOffer(null) }}>guardar</Seal>
            <button className="ink" onClick={() => setOffer(null)}>agora não</button>
          </div>
        </div>
      )}
      {news && (
        <div className="scrim center" onClick={() => setNews(null)}>
          <div className="letter" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">uma carta da oficina</p>
            <Spell as="h2" text={'Versão ' + news.version} />
            <Notes body={news.body || 'Melhorias e correções.'} />
            <Seal onClick={() => setNews(null)}>lido</Seal>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

// ——— Astrolábio: a navegação. As categorias ficam no limbo; os links são estrelas na rete. ———
const Astrolabe = memo(function Astrolabe({ items, filter, counts, dueCount, onFilter, onPick }: {
  items: Item[]; filter: Kind | null; counts: Record<string, number>; dueCount: number
  onFilter: (k: Kind | null) => void; onPick: (id: string) => void
}) {
  const R = 170
  const marks: (Kind | null)[] = [null, ...KIND_IDS]
  const angleOf = (i: number) => -90 + i * (360 / marks.length)
  const activeIdx = marks.indexOf(filter)
  const stars = items.slice(0, 80).map((i) => {
    const sector = KIND_IDS.indexOf(i.kind) + 1
    const base = angleOf(sector) + ((hash(i.id) % 40) - 20)
    const days = i.remindAt ? Math.max(0, (i.remindAt - Date.now()) / 864e5) : 60
    const r = isDue(i) ? 26 : 34 + Math.min(1, Math.log1p(days) / Math.log1p(60)) * (R - 70)
    const a = (base * Math.PI) / 180
    return { i, x: Math.cos(a) * r, y: Math.sin(a) * r, base }
  })
  const lines = KIND_IDS.map((k) => {
    const s = stars.filter((x) => x.i.kind === k).sort((a, b) => a.base - b.base)
    return { k, d: s.length > 1 ? 'M' + s.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') : '' }
  })
  return (
    <svg className="astrolabe" viewBox="-210 -210 420 420" role="img" aria-label="Astrolábio: categorias no anel, links como estrelas">
      <g className="mater">
        <circle r={R + 30} className="limb-outer" />
        <circle r={R} className="limb" />
        {Array.from({ length: 120 }, (_, k) => {
          const a = (k * 3 * Math.PI) / 180, l = k % 10 === 0 ? 12 : k % 5 === 0 ? 7 : 3.5
          return <line key={k} x1={Math.cos(a) * R} y1={Math.sin(a) * R} x2={Math.cos(a) * (R + l)} y2={Math.sin(a) * (R + l)} />
        })}
        <circle r={R * 0.62} className="tropic" />
        <circle r={R * 0.3} className="tropic" />
        {[0.9, 0.75, 0.6, 0.45].map((f) => <circle key={f} cy={R * (1 - f) * 0.55} r={R * f * 0.92} className="almucantar" />)}
        <path d={`M0 ${-R} V${R} M${-R} 0 H${R}`} className="cross" />
      </g>

      <g className="rete">
        <circle cy={-R * 0.22} r={R * 0.66} className="ecliptic" />
        {lines.map(({ k, d }) => d && <path key={k} d={d} className={'constellation ' + (filter && filter !== k ? 'dim' : '')} />)}
        {stars.map(({ i, x, y }) => (
          <g key={i.id} className={'star ' + (isDue(i) ? 'due ' : '') + (filter && filter !== i.kind ? 'dim' : '')} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} onClick={() => onPick(i.id)}>
            <circle r="10" className="halo" />
            <path d="M0 -4.5 L1.1 -1.1 L4.5 0 L1.1 1.1 L0 4.5 L-1.1 1.1 L-4.5 0 L-1.1 -1.1 Z" className="point" />
            <title>{(i.title || host(i.url)) + (i.remindAt ? ' — ' + relative(i.remindAt) : '')}</title>
          </g>
        ))}
      </g>

      <g className="alidade" style={{ transform: `rotate(${angleOf(Math.max(0, activeIdx)) + 90}deg)` }}>
        <path d={`M-3 ${R - 8} L0 ${R + 2} L3 ${R - 8} M0 ${R - 8} V${-R + 8} M-3 ${-R + 8} L0 ${-R - 2} L3 ${-R + 8}`} />
        <rect x="-5" y={-R * 0.5} width="10" height="22" rx="2" />
      </g>

      {marks.map((k, i) => {
        const a = (angleOf(i) * Math.PI) / 180
        const x = Math.cos(a) * (R + 16), y = Math.sin(a) * (R + 16)
        const on = filter === k
        return (
          <g key={k ?? 'all'} className={'mark ' + (on ? 'on' : '')} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} onClick={() => onFilter(on ? null : k)} role="button" aria-label={k ? KINDS[k].label : 'Tudo'}>
            <circle r="17" className="mark-bg" />
            <text y="6">{k ? KINDS[k].sigil : '∗'}</text>
            {k && counts[k] > 0 && <text className="mark-count" x="14" y="-10">{counts[k]}</text>}
            <title>{k ? `${KINDS[k].label} — ${KINDS[k].word}, ${KINDS[k].meaning}` : 'Tudo'}</title>
          </g>
        )
      })}

      <g className={'umbilicus ' + (dueCount ? 'due' : '')}>
        <circle r="13" />
        {dueCount > 0 ? <text y="4.5">{greekNumeral(dueCount)}</text> : <circle r="3" className="pin" />}
      </g>
    </svg>
  )
})

// ——— Oráculo: a cada abertura, uma carta diferente ———
function Oracle({ items, onOpen, onDone }: { items: Item[]; onOpen: (id: string) => void; onDone: (id: string) => void }) {
  const pick = useCallback((exclude?: string) => {
    const due = items.filter(isDue)
    const pool = (due.length ? due : items).filter((i) => i.id !== exclude)
    const p = pool.length ? pool : items
    const w = p.map((i) => 1 + Math.sqrt((Date.now() - i.createdAt) / 864e5))
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    return p.find((_, k) => (r -= w[k]) <= 0) ?? p[0]
  }, [items])
  const [id, setId] = useState<string>(() => { let last: string | undefined; try { last = localStorage.getItem('rete:last') ?? undefined } catch {} return pick(last).id })
  const [flipped, setFlipped] = useState(false)
  const item = items.find((i) => i.id === id) ?? items[0]
  useEffect(() => { try { localStorage.setItem('rete:last', item.id) } catch {} }, [item.id])
  useEffect(() => { const t = setTimeout(() => setFlipped(true), 650); return () => clearTimeout(t) }, [id])
  const next = () => { setFlipped(false); setTimeout(() => setId(pick(item.id).id), 420) }
  const k = KINDS[item.kind]
  const line = isDue(item) ? 'Você pediu para lembrar disto.' : 'Talvez seja a hora disto.'
  return (
    <section className="oracle">
      <div className="oracle-copy">
        <p className="eyebrow">{isDue(item) ? 'chegou a hora' : 'o oráculo tirou uma carta'}</p>
        <Spell as="h2" text={line} key={line + id} speed={0.6} />
        <p className="aside">Toda vez que você abre o app, uma estrela da rede vem até você.</p>
        <div className="row">
          <a href={item.url} target="_blank" rel="noreferrer" className="seal-link"><Seal>abrir</Seal></a>
          <button className="ink" onClick={next}>outra carta</button>
          <button className="ink" onClick={() => { onDone(item.id); next() }}>já fiz ✓</button>
        </div>
      </div>
      <div className={'tarot ' + (flipped ? 'flipped' : '')} onClick={() => (flipped ? onOpen(item.id) : setFlipped(true))}>
        <div className="face back"><TarotBack /></div>
        <div className="face front">
          <div className="tarot-img" style={art(item)}>{item.image ? <img src={item.image} alt="" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <b className="script">{k.sigil}</b>}</div>
          <div className="tarot-body">
            <span className="tarot-word"><span className="script">{k.sigil} · {k.word}</span></span>
            <h3>{item.title || host(item.url)}</h3>
            <span className="mono">{host(item.url)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function TarotBack() {
  return (
    <svg viewBox="-100 -165 200 330" className="tarot-back" aria-hidden>
      <rect x="-90" y="-155" width="180" height="310" rx="6" className="frame" />
      <rect x="-82" y="-147" width="164" height="294" rx="3" className="frame thin" />
      <g className="rays">{Array.from({ length: 36 }, (_, i) => { const a = (i * 10 * Math.PI) / 180; return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * (i % 2 ? 58 : 72)} y2={Math.sin(a) * (i % 2 ? 58 : 72)} /> })}</g>
      <circle r="26" className="frame" />
      <text y="10" className="script">ρ</text>
      {[-120, 120].map((y) => <text key={y} y={y + 5} className="corner">✦</text>)}
    </svg>
  )
}

// Arte generativa: cada domínio tem sua paleta, quando não há imagem
function art(i: Item): React.CSSProperties {
  const h = hash(host(i.url)), a = h % 360, b = (a + 40 + (h >> 8) % 80) % 360
  return { background: `radial-gradient(120% 90% at ${20 + (h % 60)}% 10%, hsl(${a} 55% 58%), transparent 60%), radial-gradient(100% 100% at 90% 100%, hsl(${b} 45% 38%), hsl(${a} 25% 14%))` }
}

// ——— Folha: uma entrada do catálogo ———
const Leaf = memo(function Leaf({ item: i, n, onOpen }: { item: Item; n: number; onOpen: (id: string) => void }) {
  const onClick = () => onOpen(i.id)
  const k = KINDS[i.kind]
  const [broken, setBroken] = useState(false)
  return (
    <article className={'leaf ' + (isDue(i) ? 'due ' : '') + (i.loading ? 'loading' : '')} onClick={onClick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <figure className="plate" style={art(i)}>
        {i.image && !broken ? <img src={i.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <b className="script">{k.sigil}</b>}
        {i.price && <span className="price">{i.price}</span>}
      </figure>
      <div className="caption">
        <p className="leaf-meta"><span className="num">{greekNumeral(n)}</span><span className="script sig" title={k.word}>{k.sigil}</span><span className="mono">{i.site || host(i.url)}</span></p>
        <h3>{i.loading ? <span className="shimmer">lendo as estrelas…</span> : i.title || host(i.url)}</h3>
        {i.note && <p className="marg">{i.note}</p>}
        {i.remindAt && !i.doneAt && <p className={'when ' + (isDue(i) ? 'now' : '')}>☾ {isDue(i) ? 'chegou a hora' : relative(i.remindAt)}</p>}
      </div>
    </article>
  )
})

// ——— Pena: a forma de escrever na rede ———
function Quill({ onAdd }: { onAdd: (url: string) => void }) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !(e.target as HTMLElement).closest('input,textarea')) { e.preventDefault(); ref.current?.focus() } }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  const fromClipboard = async () => {
    const t = await readClipboard()
    if (t && extractUrl(t)) return onAdd(t)
    ref.current?.focus()
  }
  return (
    <form className="quill" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v); setV('') } }}>
      <span className="nib" aria-hidden>✒</span>
      <input ref={ref} value={v} onChange={(e) => setV(e.target.value)} placeholder="escreva um link — ou só cole em qualquer lugar" inputMode="url" enterKeyHint="done" aria-label="Novo link" />
      {v ? <Seal small type="submit">guardar</Seal> : <Seal small type="button" onClick={fromClipboard} title="Colar o que você copiou">colar</Seal>}
    </form>
  )
}

// ——— Ficha do item, escrita em frases ———
function Ficha({ item: i, hour, onClose, patch, remove, say }: { item: Item; hour: number; onClose: () => void; patch: (p: Partial<Item>) => void; remove: () => void; say: (t: string) => void }) {
  const [note, setNote] = useState(i.note ?? '')
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const remind = (when: number) => { patch({ remindAt: when, notifiedAt: undefined }); say('☾ lembro ' + relative(when)) }
  const local = (ms?: number) => { if (!ms) return ''; const d = new Date(ms - new Date().getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16) }
  const k = KINDS[i.kind]
  return (
    <div className="scrim" onClick={onClose}>
      <aside className="sheet ficha" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={i.title || i.url}>
        <div className="grip" />
        <figure className="sheet-plate" style={art(i)}>{i.image ? <img src={i.image} alt="" referrerPolicy="no-referrer" /> : <b className="script">{k.sigil}</b>}</figure>
        <div className="sheet-body">
          <p className="mono">{i.site || host(i.url)}{i.price && ' · ' + i.price}</p>
          <h2>{i.title || host(i.url)}</h2>
          {i.description && <p className="desc">{i.description}</p>}
          <div className="row"><a href={i.url} target="_blank" rel="noreferrer" className="seal-link"><Seal>abrir o link</Seal></a></div>

          <p className="sentence">Isto é <Choice value={i.kind} onChange={(v) => patch({ kind: v })}
            options={KIND_IDS.map((x) => [x, <><span className="script">{KINDS[x].sigil}</span> {KINDS[x].one}</>])} sep="," />.</p>

          <p className="sentence">Me lembre <Choice value={-1 as number} onChange={(v) => remind(REMINDERS[v].when(hour))}
            options={REMINDERS.map((r, n) => [n, r.label])} sep="," /> ou <label className="word date">num dia exato<input type="datetime-local" value={local(i.remindAt)} onChange={(e) => e.target.value && remind(new Date(e.target.value).getTime())} /></label>.</p>
          {i.remindAt && (
            <p className="aside">
              ☾ Marcado para <b>{new Date(i.remindAt).toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</b> ({relative(i.remindAt)}).{' '}
              {isNative ? (isMobile ? 'O celular toca mesmo com o app fechado.' : 'O Rete toca da bandeja, mesmo com a janela fechada.') : <button className="ink" onClick={() => downloadIcs(i)}>pôr no calendário</button>} ·{' '}
              <button className="ink" onClick={() => patch({ remindAt: undefined })}>desmarcar</button>
            </p>
          )}

          <label className="ruled">
            <span>nota à margem</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (i.note ?? '') && patch({ note })} placeholder="por que guardei isso?" rows={3} />
          </label>

          <div className="row end">
            <button className="ink danger" onClick={() => confirm('Esquecer este link?') && remove()}>esquecer</button>
            {i.doneAt ? <Seal onClick={() => patch({ doneAt: undefined })}>↺ de volta à rede</Seal>
              : <Seal onClick={() => { patch({ doneAt: Date.now() }); onClose(); say('✓ consumido') }}>✓ já consumi</Seal>}
          </div>
        </div>
      </aside>
    </div>
  )
}
