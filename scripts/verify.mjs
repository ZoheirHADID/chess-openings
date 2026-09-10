#!/usr/bin/env node
/**
 * Verifications de non-regression sur les donnees et la logique metier :
 *  1. tous les chemins de l'arbre sont des suites de coups legales ;
 *  2. l'index de recherche pointe bien vers un noeud nomme existant ;
 *  3. un PGN reel est parse puis replace sur la bonne branche.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(join(ROOT, 'public', 'openings.json'), 'utf8'))

let checked = 0
let illegal = 0
let named = 0

/** Parcours complet de l'arbre en verifiant la legalite de chaque coup. */
function walk(node, chess) {
  if (node.n) named++
  checked++
  for (const child of node.c ?? []) {
    const clone = new Chess(chess.fen())
    try {
      clone.move(child.s)
    } catch {
      illegal++
      console.error(`  coup illegal : ${child.s} depuis ${chess.fen()}`)
      continue
    }
    walk(child, clone)
  }
}
walk(data.root, new Chess())

// L'index doit correspondre a un noeud nomme de l'arbre
let missing = 0
for (const entry of data.index) {
  let node = data.root
  for (const san of entry.path.split(' ')) {
    node = (node.c ?? []).find((c) => c.s === san)
    if (!node) break
  }
  if (!node || !node.n) missing++
}

// Parsing PGN + placement sur la branche
const pgn = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abcd1234"]
[White "zoheir"]
[Black "adversaire"]
[Result "1-0"]
[UTCDate "2026.03.14"]

1. e4 { [%clk 0:03:00] } c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 (5... g6) 6. Be3 e5 1-0`

const cleaned = pgn
  .split(/\n\s*\n/)[1]
  .replace(/\{[^}]*\}/g, ' ')
  .replace(/\([^()]*\)/g, ' ')
  .replace(/\d+\.(\.\.)?/g, ' ')
  .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ')

const chess = new Chess()
const sans = []
for (const token of cleaned.split(/\s+/).filter(Boolean)) {
  try {
    sans.push(chess.move(token).san)
  } catch {
    break
  }
}

let node = data.root
let depth = 0
let lastName = null
for (const san of sans) {
  const child = (node.c ?? []).find((c) => c.s === san)
  if (!child) break
  node = child
  depth++
  if (child.n) lastName = child.n
}

console.log('Verification de la base d\'ouvertures')
console.log(`  noeuds parcourus      : ${checked}`)
console.log(`  ouvertures nommees    : ${named} (attendu ${data.openings})`)
console.log(`  coups illegaux        : ${illegal}`)
console.log(`  index orphelins       : ${missing}`)
console.log('Verification du placement d\'une partie')
console.log(`  coups reconnus        : ${sans.length} -> ${sans.join(' ')}`)
console.log(`  profondeur dans l'arbre: ${depth}`)
console.log(`  ouverture identifiee  : ${lastName}`)

const ok = illegal === 0 && missing === 0 && named === data.openings && lastName === 'Sicilian Defense: Najdorf Variation, English Attack'
console.log(ok ? '\nTout est conforme.' : '\nEchec des verifications.')
process.exit(ok ? 0 : 1)
