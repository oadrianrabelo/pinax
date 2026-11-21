import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { hash } from '../core/model'

// Trechos em grego/hebraico/aramaico ganham a fonte "dos sigilos" automaticamente
export function Scripts({ text }: { text: string }) {
  const parts = text.split(/([Ͱ-Ͽἀ-῿֐-׿܀-ݏ]+(?:\s+[Ͱ-Ͽἀ-῿֐-׿܀-ݏ]+)*)/)
  return <>{parts.map((p, k) => (k % 2 ? <span key={k} className="script">{p}</span> : <span key={k}>{p}</span>))}</>
}

export function Notes({ body }: { body: string }) {
  return (
    <div className="notes">
      {body.split('\n').filter((l) => l.trim()).map((l, k) =>
        l.startsWith('###') ? <h5 key={k}>{l.replace(/^#+\s*/, '')}</h5>
          : <p key={k}>{l.replace(/^\*\s*/, '· ').replace(/\*\*([^*]+)\*\*/g, '$1')}</p>)}
    </div>
  )
}

/** Selo de lacre: a ação principal. O contorno irregular muda com o texto, como um lacre de verdade. */
export function Seal({ children, small, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { small?: boolean; children: ReactNode }) {
  const h = hash(String(typeof children === 'string' ? children : 'selo'))
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2, r = 47 + ((h >> (i % 24)) & 3) * 0.6
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`
  }).join(' ')
  return (
    <button {...rest} className={'seal ' + (small ? 'small ' : '') + (className ?? '')}>
      <svg viewBox="0 0 100 100" aria-hidden preserveAspectRatio="none">
        <polygon points={pts} className="wax" />
        <ellipse cx="50" cy="50" rx="38" ry="34" className="ring" />
      </svg>
      <span>{children}</span>
    </button>
  )
}

/** Escolha em forma de frase: palavras clicáveis, a escolhida fica rubricada. */
export function Choice<T extends string | number | boolean>({ value, options, onChange, sep = '·' }: {
  value: T; options: [T, ReactNode][]; onChange: (v: T) => void; sep?: string
}) {
  return (
    <span className="choice">
      {options.map(([v, label], i) => (
        <span key={String(v)}>
          {i > 0 && <span className="sep">{sep === ',' ? ', ' : ` ${sep} `}</span>}
          <button type="button" className={'word ' + (v === value ? 'on' : '')} aria-pressed={v === value} onClick={() => onChange(v)}>{label}</button>
        </span>
      ))}
    </span>
  )
}

/**
 * Folha (ficha, ateliê): trava a página de trás enquanto está aberta e fecha
 * ao ser arrastada para baixo — só quando o conteúdo de dentro já está no topo,
 * para não brigar com a rolagem da própria folha.
 */
export function useSheet<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const html = document.documentElement
    const locks = Number(html.dataset.locks || 0) + 1
    html.dataset.locks = String(locks)
    html.classList.add('locked')
    return () => {
      const left = Math.max(0, Number(html.dataset.locks || 1) - 1)
      html.dataset.locks = String(left)
      if (!left) html.classList.remove('locked')
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let y0 = 0, dy = 0, t0 = 0, dragging = false
    // a área que rola de verdade sob o dedo (a folha ou algo dentro dela)
    const scroller = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el.parentElement; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n
      }
      return el
    }
    const start = (e: TouchEvent) => {
      dragging = scroller(e.target).scrollTop <= 0
      y0 = e.touches[0].clientY; dy = 0; t0 = Date.now()
    }
    const move = (e: TouchEvent) => {
      if (!dragging) return
      dy = e.touches[0].clientY - y0
      if (dy <= 0) { el.style.transform = ''; if (dy < -6) dragging = false; return }
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      const flick = dy > 40 && Date.now() - t0 < 260
      el.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1)'
      if (dy > 110 || flick) { el.style.transform = 'translateY(110%)'; setTimeout(() => close.current(), 220) }
      else el.style.transform = ''
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [])

  return ref
}
