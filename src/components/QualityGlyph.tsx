import type { QualityBadge } from '../lib/engine'

/** Livre ouvert, silhouette pleine : pastille « coup de théorie » façon chess.com. */
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[72%] w-[72%]" fill="currentColor">
      <path d="M12 6.4C10.2 4.9 7.7 4.2 3.5 4.2v13.6c4.2 0 6.7.7 8.5 2.2 1.8-1.5 4.3-2.2 8.5-2.2V4.2c-4.2 0-6.7.7-8.5 2.2z" />
      <path d="M11.4 7.6h1.2V19h-1.2z" fill="#a88865" />
    </svg>
  )
}

/** Contenu d'une pastille de classification : icône vectorielle ou glyphe texte. */
export default function QualityGlyph({ badge }: { badge: QualityBadge }) {
  if (badge.icon === 'book') return <BookIcon />
  return <>{badge.glyph}</>
}
