import { useState, type MouseEvent, type KeyboardEvent } from 'react'
import { frName } from '../lib/frenchNames'

interface Props {
  /** Nom Lichess (anglais). */
  name: string
  className?: string
  /** Sans l'icone « en » (tres petits espaces). */
  plain?: boolean
}

/**
 * Nom d'ouverture en francais, avec une icone sobre « en » qui donne le nom
 * anglais d'origine : au survol (infobulle) et d'une touche (affiche a cote).
 */
export default function OpeningName({ name, className = '', plain }: Props) {
  const [showEnglish, setShowEnglish] = useState(false)
  const fr = frName(name)
  const translated = fr !== name

  const toggle = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowEnglish((open) => !open)
  }

  return (
    <span className={`inline-flex min-w-0 max-w-full items-baseline gap-1 ${className}`}>
      <span className="min-w-0 truncate">{showEnglish ? name : fr}</span>
      {translated && !plain && (
        <span
          role="button"
          tabIndex={0}
          title={showEnglish ? `En français : ${fr}` : `En anglais : ${name}`}
          aria-label={showEnglish ? 'Afficher le nom français' : 'Afficher le nom anglais'}
          aria-pressed={showEnglish}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') toggle(e)
          }}
          className={`shrink-0 cursor-pointer rounded border px-[3px] text-[8px] leading-[13px] font-semibold tracking-wide uppercase select-none ${
            showEnglish
              ? 'border-slate-400/70 bg-slate-600/40 text-slate-100'
              : 'border-slate-600/60 text-slate-500 hover:border-slate-400 hover:text-slate-200'
          }`}
        >
          {showEnglish ? 'fr' : 'en'}
        </span>
      )}
    </span>
  )
}
