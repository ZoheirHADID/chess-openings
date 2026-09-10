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
  /** Ce que le coup apporte. */
  points: string[]
  /** Ce qu'il concede : defauts reperes dans la position. */
  warnings: string[]
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

/** La tour et la dame sont feminines : articles et accords suivent. */
const FEMININE = new Set(['r', 'q'])
const article = (type: string, capital = false) => {
  const word = FEMININE.has(type) ? 'la' : 'le'
  return capital ? word[0].toUpperCase() + word.slice(1) : word
}
/** Terminaison d'accord du participe passe. */
const agree = (type: string) => (FEMININE.has(type) ? 'e' : '')

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
            return `Cloue ${article(blocker.type)} ${PIECE_NAMES[blocker.type]} en ${blocker.square} sur le roi : la pièce ne peut plus bouger.`
          }
          if (piece.type === 'q' && VALUES[blocker.type] < VALUES.q) {
            return `Enfile ${article(blocker.type)} ${PIECE_NAMES[blocker.type]} en ${blocker.square} devant la dame adverse.`
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
      threats.push(`${article(target.type)} ${PIECE_NAMES[target.type]} en ${square.to}`)
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
        ? `Capture ${article(move.captured)} ${PIECE_NAMES[move.captured]} en ${move.to}, de plus grande valeur que ${article(move.piece)} ${PIECE_NAMES[move.piece]} qui prend.`
        : `Capture ${article(move.captured)} ${PIECE_NAMES[move.captured]} en ${move.to}.`,
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
    points.push(`Développe ${article(move.piece)} ${PIECE_NAMES[move.piece]} et rapproche du roque.`)
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

/**
 * Defauts du coup reperes dans la position obtenue. Ces controles sont
 * volontairement prudents : ils decrivent un fait verifiable (piece attaquee,
 * capture disponible, droit de roque perdu) plutot qu'un jugement global, que
 * seul le moteur peut porter.
 */
function findWeaknesses(move: DetailedMove, sans: string[]): string[] {
  const warnings: string[] = []
  const after = new Chess(move.after)
  const own = move.color
  const enemy: 'w' | 'b' = own === 'w' ? 'b' : 'w'
  const ply = sans.length

  // 1. La piece qui vient de jouer est-elle exposee ?
  const attackers = after.attackers(move.to as never, enemy)
  const defenders = after.attackers(move.to as never, own)
  if (attackers.length > 0 && move.piece !== 'k') {
    const cheapest = Math.min(...attackers.map((sq) => VALUES[after.get(sq as never)?.type ?? 'p']))
    if (defenders.length === 0) {
      warnings.push(
        `${article(move.piece, true)} ${PIECE_NAMES[move.piece]} en ${move.to} est attaqué${agree(move.piece)} et n’est défendu${agree(move.piece)} par rien.`,
      )
    } else if (cheapest < VALUES[move.piece]) {
      warnings.push(
        `${article(move.piece, true)} ${PIECE_NAMES[move.piece]} en ${move.to} est attaqué${agree(move.piece)} par une pièce de moindre valeur.`,
      )
    }
  }

  // 2. Une capture avantageuse s'offre-t-elle a l'adversaire ?
  let bestGain = 0
  let bestTarget = ''
  for (const reply of after.moves({ verbose: true })) {
    if (!reply.captured) continue
    const guarded = after.attackers(reply.to as never, own).length > 0
    const gain = VALUES[reply.captured] - (guarded ? VALUES[reply.piece] : 0)
    if (gain > bestGain) {
      bestGain = gain
      bestTarget = `${article(reply.captured)} ${PIECE_NAMES[reply.captured]} en ${reply.to}`
    }
  }
  if (bestGain >= 1 && bestTarget) {
    warnings.push(`L’adversaire peut gagner du matériel en prenant ${bestTarget}.`)
  }

  // 3. Sortie precoce de la dame
  if (move.piece === 'q' && ply <= 12 && !move.captured) {
    const home = own === 'w' ? 'd1' : 'd8'
    if (move.from === home) {
      warnings.push('Sortie précoce de la dame : elle sera chassée par le développement adverse, avec perte de temps.')
    }
  }

  // 4. Pion pousse devant le roi deja roque
  if (move.piece === 'p') {
    const king = after.findPiece({ type: 'k', color: own })[0] as string | undefined
    if (king) {
      const kingFile = king.charCodeAt(0) - 97
      const pawnFile = move.to.charCodeAt(0) - 97
      const castled = own === 'w' ? king[1] === '1' : king[1] === '8'
      const kingSide = kingFile >= 5 || kingFile <= 2
      if (castled && kingSide && Math.abs(kingFile - pawnFile) <= 1 && !move.captured) {
        warnings.push(`Ce pion s’avance devant le roi : l’abri en ${king} s’affaiblit.`)
      }
    }
  }

  // 5. Cavalier au bord
  if (move.piece === 'n' && (move.to[0] === 'a' || move.to[0] === 'h')) {
    warnings.push('Cavalier au bord : il ne contrôle plus que la moitié des cases.')
  }

  // 6. Droit de roque perdu
  const rightsBefore = move.before.split(' ')[2] ?? '-'
  const rightsAfter = move.after.split(' ')[2] ?? '-'
  const mine = own === 'w' ? /[KQ]/g : /[kq]/g
  const lost = (rightsBefore.match(mine)?.length ?? 0) - (rightsAfter.match(mine)?.length ?? 0)
  if (lost > 0 && !move.flags.includes('k') && !move.flags.includes('q')) {
    warnings.push('Ce coup fait perdre le droit de roquer de ce côté.')
  }

  // 7. Meme piece deplacee plusieurs fois pendant le developpement
  if (ply <= 20 && !move.captured) {
    const chess = new Chess()
    const moves = new Map<string, number>()
    for (const san of sans) {
      try {
        const played = chess.move(san)
        const count = (moves.get(played.from) ?? 0) + 1
        moves.delete(played.from)
        moves.set(played.to, count)
      } catch {
        break
      }
    }
    const times = moves.get(move.to) ?? 1
    if (times >= 3) {
      warnings.push(
        `C’est le ${times}e déplacement de cette pièce : pendant ce temps, les autres restent à leur place.`,
      )
    }
  }

  return warnings.slice(0, 3)
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
    warnings: findWeaknesses(move, sans),
    plan: family ? FAMILY_PLANS[family] : undefined,
    wikibooks: wikibooksUrl(sans),
  }
}
