import { useLayoutEffect, useRef, type ElementType } from 'react'
import { activeScript, counterpart, usePrefs } from './prefs'

/**
 * Feitiço: a palavra aparece primeiro escrita no alfabeto antigo da era — cada letra é a
 * irmã de verdade da letra final (R ← ρ, t ← τ; no hebraico R ← ר) — e cada uma gira
 * como uma moeda até virar a letra de hoje, da esquerda para a direita.
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
    let cleanup: (() => void)[] = []
    cast.current = () => {
      cleanup.forEach((f) => f()); cleanup = []
      if (!prefs.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const spans = [...el.querySelectorAll<HTMLSpanElement>('.g')]
      // lê todas as larguras de uma vez, depois escreve (evita recalcular o layout letra a letra)
      const widths = spans.map((s) => s.getBoundingClientRect().width)
      spans.forEach((s, i) => {
        const final = s.dataset.c!
        const ancient = counterpart(final, script)
        if (!final.trim()) return
        s.style.width = widths[i] + 'px'
        const start = delay + i * 75 * speed
        const dur = 1000 * speed
        s.textContent = ancient
        s.classList.add('flick')
        const a = s.animate([
          { transform: 'translateY(-.25em) rotateY(-90deg)', opacity: 0 },
          { transform: 'translateY(0) rotateY(0deg)', opacity: 1, offset: 0.25 },
          { transform: 'rotateY(360deg)', offset: 0.6 },
          { transform: 'rotateY(720deg)', opacity: 1 },
        ], { duration: dur, delay: start, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' })
        // troca de alfabeto no meio do giro, quando a moeda está de lado
        const t = window.setTimeout(() => {
          s.textContent = final; s.classList.remove('flick'); s.classList.add('lit')
        }, start + dur * 0.68)
        const t2 = window.setTimeout(() => { s.style.width = ''; s.classList.remove('lit') }, start + dur + 900)
        cleanup.push(() => { clearTimeout(t); clearTimeout(t2); a.cancel(); s.textContent = final; s.classList.remove('flick', 'lit'); s.style.width = '' })
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
