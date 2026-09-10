#!/usr/bin/env node
/**
 * Genere src/components/pieces.tsx : un sprite SVG contenant les 12 pieces
 * Cburnett (CC BY-SA 3.0), exposees via <use href="#piece-xx" />.
 * Source : lichess-org/lila, public/piece/cburnett/.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'data', 'pieces')
const OUT = join(ROOT, 'src', 'components', 'pieces.tsx')

const symbols = readdirSync(SRC)
  .filter((f) => f.endsWith('.svg'))
  .map((file) => {
    const code = file.replace('.svg', '')
    const raw = readFileSync(join(SRC, file), 'utf8')
    const inner = raw
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .trim()
    return `<symbol id="piece-${code}" viewBox="0 0 45 45">${inner}</symbol>`
  })
  .join('')

const content = `/* Genere par scripts/build-pieces.mjs — ne pas editer a la main.
 * Pieces d'echecs Cburnett (CC BY-SA 3.0), via lichess-org/lila. */
import type { CSSProperties } from 'react'

const SYMBOLS = ${JSON.stringify(`<defs>${symbols}</defs>`)}

/** A monter une seule fois : declare les 12 pieces reutilisables. */
export function PieceSprite() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: SYMBOLS }}
    />
  )
}

interface PieceProps {
  /** Type de piece en notation chess.js : p, n, b, r, q, k. */
  type: string
  color: 'w' | 'b'
  className?: string
  style?: CSSProperties
}

export function Piece({ type, color, className, style }: PieceProps) {
  const code = \`\${color}\${type.toUpperCase()}\`
  return (
    <svg viewBox="0 0 45 45" className={className} style={style} aria-hidden="true">
      <use href={\`#piece-\${code}\`} />
    </svg>
  )
}
`

writeFileSync(OUT, content)
console.log(`  ecrit : src/components/pieces.tsx (${(content.length / 1024).toFixed(1)} Ko)`)
