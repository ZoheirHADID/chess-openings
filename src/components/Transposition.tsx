import type { TreeNode } from '../lib/types'
import { formatMoveList } from '../lib/chess'
import { frName } from '../lib/frenchNames'
import { nearestNamed } from '../lib/tree'
import OpeningName from './OpeningName'

interface Props {
  nodes: TreeNode[]
  /** La ligne affichee est sortie de la theorie : la transposition la rejoint. */
  outOfBook: boolean
  onJoin: (node: TreeNode) => void
  compact?: boolean
}

/**
 * Transposition : la position affichee existe dans l'arbre sous un autre ordre
 * de coups. Hors theorie, c'est une porte de retour vers une ligne repertoriee.
 */
export default function Transposition({ nodes, outOfBook, onJoin, compact }: Props) {
  if (nodes.length === 0) return null
  const text = compact ? 'text-[10px]' : 'text-[11px]'
  return (
    <div
      className={`space-y-1 rounded-lg border px-2.5 py-1.5 ${text} ${
        outOfBook ? 'border-emerald-700/60 bg-emerald-950/25 text-emerald-100' : 'border-slate-700/70 bg-slate-900/50 text-slate-300'
      }`}
    >
      <p className={`font-semibold ${outOfBook ? 'text-emerald-300' : 'text-slate-400'}`}>
        {outOfBook ? 'Transposition : vous êtes en fait dans la théorie' : 'Position aussi atteinte par transposition'}
      </p>
      <ul className="space-y-0.5">
        {nodes.map((node) => {
          const named = nearestNamed(node)
          return (
            <li key={node.id} className="flex min-w-0 items-baseline gap-1.5">
              <button
                onClick={() => onJoin(node)}
                className={`shrink-0 rounded border px-1.5 py-0.5 font-medium transition-colors ${
                  outOfBook
                    ? 'border-emerald-600/70 text-emerald-200 hover:bg-emerald-900/40'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                }`}
                title="Afficher cette ligne dans l’arbre"
              >
                {outOfBook ? 'Rejoindre' : 'Voir'}
              </button>
              <span className="min-w-0 break-words">
                <span className="font-mono">{formatMoveList(node.id.split(' '))}</span>
                {named?.name && (
                  <span className="text-slate-400">
                    {' '}
                    · <OpeningName name={named.name} /> {named.eco && <span className="text-slate-500">{named.eco}</span>}
                  </span>
                )}
                {!named?.name && node.name && <span className="text-slate-400"> · {frName(node.name)}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
