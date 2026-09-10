import { Chess } from 'chess.js'
import type { DetailedMove } from './chess'
import { FAMILY_PLANS, MOVE_NOTES, wikibooksUrl } from '../data/openingIdeas'

/**
 * Explication d'un coup d'ouverture.
 *
 * `note` provient d'un commentaire theorique redige ; `points` est une analyse
 * automatique de la position (motifs classiques : centre, developpement, clouage,
 * securite du roi...). Les deux sont distingues dans l'interface pour ne pas faire
 * passer une heuristique pour de la theorie etablie.
 */
export interface MoveExplanation {
  /** « 3. Bb5 » ou « 3...a6 ». */
  numbered: string
  san: string
  note?: string
  points: string[]
  plan?: string
  wikibooks: string
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }
const CENTER = ['d4', 'e4', 'd5', 'e5']
const START_MINORS: Record<'w' | 'b', string[]> = {
  w: ['b1', 'g1', 'c1', 'f1'],
  b: ['b8', 'g8', 'c8', 'f8'],
}

const fileOf = (square: string) => square.charCodeAt(0) - 97
const rankOf = (square: string) => Number(square[1]) - 1
const toSquare = (file: number, rank: number) => `${String.fromCharCode(97 + file)}${rank + 1}`

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

/** Cases centrales controlees par une couleur. */
function centerControl(chess: Chess, color: 'w' | 'b'): string[] {
  return CENTER.filter((square) => chess.attackers(square as never, color).length > 0)
}

/**
 * Detecte un clouage cree par la piece qui vient de jouer : une piece adverse
 * se trouve seule entre elle et le roi (ou la dame) adverse.
 */
function detectPin(chess: Chess, move: DetailedMove): string | null {
  const dirs = move.piece === 'b' ? BISHOP_DIRS : move.piece === 'r' ? ROOK_DIRS : move.piece === 'q' ? [...ROOK_DIRS, ...BISHOP_DIRS] : []
  if (dirs.length === 0) return null
  const enemy = move.color === 'w' ? 'b' : 'w'

  for (const [df, dr] of dirs) {
    let file = fileOf(move.to) + df
    let rank = rankOf(move.to) + dr
    let blocker: { square: string; type: string } | null = null

    while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
      const square = toSquare(file, rank)
      const piece = chess.get(square as never)
      if (piece) {
        if (piece.color !== enemy) break
        if (!blocker) {
          blocker = { square, type: piece.type }
        } else {
          if (piece.type === 'k') {
            return `Cloue le ${PIECE_NAMES[blocker.type]} en ${blocker.square} sur le roi : il ne peut plus bouger.`
          }
          if (piece.type === 'q' && VALUES[blocker.type] < VALUES.q) {
            return `Enfile le ${PIECE_NAMES[blocker.type]} en ${blocker.square} devant la dame adverse.`
          }
          break
        }
      }
      file += df
      rank += dr
    }
  }
  return null
}

/** Pieces adverses attaquees par la piece qui vient de jouer. */
function newThreats(chess: Chess, move: DetailedMove): string[] {
  const enemy = move.color === 'w' ? 'b' : 'w'
  const threats: string[] = []
  for (const square of chess.moves({ verbose: true, square: move.to as never })) {
    const target = chess.get(square.to as never)
    if (!target || target.color !== enemy) continue
    if (VALUES[target.type] >= VALUES[move.piece] && target.type !== 'k') {
      threats.push(`${PIECE_NAMES[target.type]} en ${square.to}`)
    }
  }
  return threats
}

/** Analyse automatique : motifs classiques reperes dans la position. */
function analyse(move: DetailedMove): string[] {
  const points: string[] = []
  const before = new Chess(move.before)
  const after = new Chess(move.after)
  const color = move.color
  const side = color === 'w' ? 'blanc' : 'noir'

  // Roque
  if (move.flags.includes('k') || move.flags.includes('q')) {
    points.push(
      move.flags.includes('k')
        ? 'Petit roque : met le roi à l’abri derrière ses pions et active la tour vers le centre.'
        : 'Grand roque : met le roi à l’abri sur l’aile dame et amène la tour sur la colonne d.',
    )
  }

  // Capture
  if (move.captured) {
    const gain = VALUES[move.captured] - VALUES[move.piece]
    points.push(
      gain > 0
        ? `Capture le ${PIECE_NAMES[move.captured]} en ${move.to}, plus précieux que le ${PIECE_NAMES[move.piece]} qui le prend.`
        : `Capture le ${PIECE_NAMES[move.captured]} en ${move.to}.`,
    )
  }

  // Echec
  if (move.san.includes('#')) points.push('Mat.')
  else if (move.san.includes('+')) points.push('Donne échec : la réponse adverse est forcée.')

  // Occupation et controle du centre
  if (move.piece === 'p' && CENTER.includes(move.to)) {
    points.push(`Occupe le centre en ${move.to} et prive l’adversaire de cette case.`)
  } else {
    const gained = centerControl(after, color).filter((sq) => !centerControl(before, color).includes(sq))
    if (gained.length > 0) {
      points.push(`Renforce le contrôle du centre : ${gained.join(', ')} désormais sous surveillance ${side}e.`)
    }
  }

  // Developpement
  if ((move.piece === 'n' || move.piece === 'b') && START_MINORS[color].includes(move.from)) {
    points.push(`Développe le ${PIECE_NAMES[move.piece]} et rapproche du roque.`)
  }

  // Fianchetto
  if (move.piece === 'b' && ['g2', 'b2', 'g7', 'b7'].includes(move.to)) {
    points.push('Fianchetto : le fou prend la grande diagonale et surveille le centre à distance.')
  }
  if (move.piece === 'p' && ['g3', 'b3', 'g6', 'b6'].includes(move.to)) {
    points.push('Prépare le fianchetto du fou sur la grande diagonale.')
  }

  // Prophylaxie sur les cases b5/g5 (et symetriques)
  if (move.piece === 'p') {
    const prophylaxis: Record<string, string> = {
      a6: 'b5',
      h6: 'g5',
      a3: 'b4',
      h3: 'g4',
    }
    const denied = prophylaxis[move.to]
    if (denied) {
      points.push(`Prive les pièces adverses de la case ${denied} et prévient tout clouage de ce côté.`)
    }
  }

  // Clouage / enfilade
  const pin = detectPin(after, move)
  if (pin) points.push(pin)

  // Menaces creees
  const threats = newThreats(after, move)
  if (threats.length > 0) points.push(`Attaque ${threats.slice(0, 2).join(' et ')}.`)

  // Gain d'espace
  if (move.piece === 'p' && !move.captured) {
    const rank = rankOf(move.to)
    const advanced = color === 'w' ? rank >= 4 : rank <= 3
    if (advanced && !CENTER.includes(move.to)) {
      points.push('Gagne de l’espace et repousse les pièces adverses.')
    }
  }

  // Promotion
  if (move.promotion) points.push(`Promotion en ${PIECE_NAMES[move.promotion]}.`)

  return points.slice(0, 4)
}

/** Numerotation lisible : « 3. Bb5 » ou « 3...a6 ». */
export function numberMove(ply: number, san: string): string {
  const moveNumber = Math.floor((ply - 1) / 2) + 1
  return ply % 2 === 1 ? `${moveNumber}. ${san}` : `${moveNumber}...${san}`
}

/**
 * Construit l'explication du dernier coup d'une ligne.
 * `family` est le nom de famille Lichess de la position (pour le plan general).
 */
export function explainMove(sans: string[], move: DetailedMove | undefined, family?: string): MoveExplanation | null {
  if (sans.length === 0 || !move) return null
  const path = sans.join(' ')

  return {
    numbered: numberMove(sans.length, move.san),
    san: move.san,
    note: MOVE_NOTES[path],
    points: analyse(move),
    plan: family ? FAMILY_PLANS[family] : undefined,
    wikibooks: wikibooksUrl(sans),
  }
}
