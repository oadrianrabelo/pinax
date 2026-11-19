import { useLayoutEffect, useRef, type ElementType } from 'react'
import { activeScript, usePrefs } from './prefs'

/**
 * Feitiço: as letras surgem girando em órbita, trocando por letras de um alfabeto antigo,
 * e pousam formando a palavra. O alfabeto muda com a era (grego, hebraico, fenício, árabe…).
 */
export function Spell({ text, as: Tag = 'span', className, delay = 0, speed = 1, replayOnHover = false }: {
  text: string; as?: ElementType; className?: string; delay?: number; speed?: number; replayOnHover?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const prefs = usePrefs()
  const script = activeScript(prefs)
  const cast = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const glyphs = script.glyphs
    let cleanup: (() => void)[] = []
    cast.current = () => {
      cleanup.forEach((f) => f()); cleanup = []
      if (!prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const spans = [...el.querySelectorAll<HTMLSpanElement>('.g')]
      spans.forEach((s, i) => {
        const final = s.dataset.c!
        if (!final.trim()) return
        const w = s.getBoundingClientRect().width
        s.style.width = w + 'px'
        const ang = Math.random() * Math.PI * 2
        const r = (0.6 + Math.random() * 1.4) * Math.max(40, el.getBoundingClientRect().height)
        const spin = (Math.random() < 0.5 ? -1 : 1) * (540 + Math.random() * 540)
        const start = delay + i * 65 * speed
        const dur = (950 + Math.random() * 350) * speed
        const a = s.animate([
          { transform: `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r}px) rotate(${spin}deg) scale(.25)`, opacity: 0, filter: 'blur(6px)' },
          { opacity: 1, offset: 0.2 },
          { transform: `translate(${Math.cos(ang + 1.4) * r * 0.25}px, ${Math.sin(ang + 1.4) * r * 0.25}px) rotate(${spin * 0.15}deg) scale(1.15)`, filter: 'blur(1px)', offset: 0.7 },
          { transform: 'none', opacity: 1, filter: 'blur(0)' },
        ], { duration: dur, delay: start, easing: 'cubic-bezier(.22,.9,.3,1)', fill: 'backwards' })
        s.classList.add('flick')
        let t: number
        const t0 = performance.now()
        const tick = () => {
          if (performance.now() - t0 < start + dur * 0.78) {
            s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)]
            t = window.setTimeout(tick, 55)
          } else {
            s.textContent = final; s.classList.remove('flick'); s.style.width = ''
            s.classList.add('lit'); setTimeout(() => s.classList.remove('lit'), 900)
          }
        }
        tick()
        cleanup.push(() => { clearTimeout(t); a.cancel(); s.textContent = final; s.classList.remove('flick', 'lit'); s.style.width = '' })
      })
    }
    cast.current()
    return () => cleanup.forEach((f) => f())
  }, [text, script, prefs.motion]) // eslint-disable-line

  const words = text.split(/(\s+)/)
  let k = 0
  return (
    <Tag ref={ref} className={'spell ' + (className ?? '')} aria-label={text} onMouseEnter={replayOnHover ? () => cast.current() : undefined}>
      {words.map((w, wi) => /^\s+$/.test(w) ? ' ' : (
        <span className="w" key={wi} aria-hidden>{[...w].map((c) => <span className="g" key={k++} data-c={c}>{c}</span>)}</span>
      ))}
    </Tag>
  )
}

// Numerais gregos (alfabéticos): 1 = α΄, 12 = ιβ΄, 247 = σμζ΄
const U = ['', 'α', 'β', 'γ', 'δ', 'ε', 'ϛ', 'ζ', 'η', 'θ']
const T = ['', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ϟ']
const H = ['', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'ϡ']
export function greekNumeral(n: number) {
  if (n <= 0 || n >= 1000) return String(n)
  return H[Math.floor(n / 100)] + T[Math.floor(n / 10) % 10] + U[n % 10] + 'ʹ'
}
