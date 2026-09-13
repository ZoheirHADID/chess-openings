import type { MoveExplanation } from '../lib/explain'
import { QUALITY_BADGE, type MoveVerdict } from '../lib/engine'
import QualityGlyph from './QualityGlyph'
import type { FaultExplanation } from '../lib/refutation'
import AiExplain from './AiExplain'
import OpeningName from './OpeningName'
import { frName } from '../lib/frenchNames'
import type { TheoryGap } from '../lib/deviations'
import type { PracticalNote } from '../lib/practical'
import type { Docs } from '../lib/docs'
import { DOCS_SYSTEM_PROMPT, MOVE_SYSTEM_PROMPT, buildDocsPrompt } from '../lib/aiExplain'
import type { CreatorVideo } from '../data/openingVideos'

const formatDuration = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

/** Videos de Julien Song et Marc Quenehen sur l'ouverture (variante exacte d'abord). */
function VideosBlock({ videos }: { videos: CreatorVideo[] }) {
  if (videos.length === 0) return null
  return (
    <section className="space-y-1">
      <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Vidéos · Julien Song &amp; Marc Quenehen</p>
      <ul className="space-y-0.5">
        {videos.map((video) => (
          <li key={video.id}>
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-baseline gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-slate-800"
              title={`${video.channel} · ${formatDuration(video.duration)}`}
            >
              <span className="shrink-0 text-[10px] text-rose-400">▶</span>
              <span className="min-w-0 flex-1 leading-snug text-slate-200">
                {video.title}
                {video.specific && <span className="ml-1 rounded bg-emerald-900/50 px-1 text-[9px] text-emerald-200">variante</span>}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {video.channel.split(' ')[0]} · {formatDuration(video.duration)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

const SOURCE_LABEL: Record<MoveVerdict['source'], string> = {
  local: 'Stockfish local',
  cloud: 'cloud Lichess',
  mixed: 'local + cloud',
}

const PRACTICAL_STYLE: Record<PracticalNote['verdict'], { box: string; head: string }> = {
  trap: { box: 'border-violet-700/60 bg-violet-950/25', head: 'text-violet-300' },
  ungrateful: { box: 'border-amber-700/60 bg-amber-950/20', head: 'text-amber-300' },
  consistent: { box: 'border-slate-700/70 bg-slate-900/50', head: 'text-slate-400' },
  sample: { box: 'border-slate-800 bg-slate-900/30', head: 'text-slate-500' },
}

/** Score pratique : ce que les humains tirent du coup, face a l'attente du moteur. */
function PracticalBlock({ note, compact }: { note: PracticalNote; compact?: boolean }) {
  const style = PRACTICAL_STYLE[note.verdict]
  const text = compact ? 'text-[10px]' : 'text-[11px]'
  const head = compact ? 'text-[9px]' : 'text-[10px]'
  return (
    <section className={`space-y-0.5 rounded-lg border ${style.box} ${compact ? 'p-2' : 'p-2.5'}`}>
      <p className={`font-semibold tracking-wide uppercase ${style.head} ${head}`}>Score pratique · Lichess</p>
      <p className={`leading-snug text-slate-100 ${text}`}>{note.headline}</p>
      {!compact && note.detail && <p className={`leading-snug text-slate-400 ${text}`}>{note.detail}</p>}
      {!compact && note.expected !== null && note.verdict !== 'sample' && (
        <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-500">
          <span className="w-16 shrink-0">Pratique</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <span className="block h-full bg-sky-400" style={{ width: `${note.score}%` }} />
          </span>
          <span className="w-9 text-right tabular-nums">{Math.round(note.score)} %</span>
        </div>
      )}
      {!compact && note.expected !== null && note.verdict !== 'sample' && (
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="w-16 shrink-0">Moteur</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <span className="block h-full bg-emerald-500" style={{ width: `${note.expected}%` }} />
          </span>
          <span className="w-9 text-right tabular-nums">{Math.round(note.expected)} %</span>
        </div>
      )}
    </section>
  )
}

/** Sources documentaires libres : Wikibooks (ligne exacte) et Wikipédia (ouverture). */
function DocsBlock({ docs }: { docs: Docs }) {
  const { wikibooks, wikipedia } = docs
  if (wikibooks === null && wikipedia === null) return null
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Sources documentaires</p>
      {wikibooks === undefined && <p className="text-[11px] text-slate-500">Recherche sur Wikibooks…</p>}
      {wikibooks && (
        <div className="space-y-1.5 rounded-lg border border-slate-700/70 bg-slate-900/50 p-2.5">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[10px] text-slate-500">
            <a href={wikibooks.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-400 hover:text-blue-300">
              Wikibooks · Chess Opening Theory ↗
            </a>
            <span>anglais · {wikibooks.license}</span>
          </p>
          {wikibooks.text.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-xs leading-relaxed text-slate-300">
              {paragraph}
            </p>
          ))}
          <AiExplain
            prompt={buildDocsPrompt(wikibooks.text, wikibooks.title)}
            system={DOCS_SYSTEM_PROMPT}
            label="Traduire et résumer avec l’IA"
            footnote="à partir de l’extrait Wikibooks"
            compact
          />
        </div>
      )}
      {wikipedia && (
        <div className="flex gap-2.5 rounded-lg border border-slate-700/70 bg-slate-900/50 p-2.5">
          {wikipedia.thumbnail && (
            <img src={wikipedia.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded object-cover" loading="lazy" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[10px] text-slate-500">
              <a href={wikipedia.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-400 hover:text-blue-300">
                Wikipédia · {wikipedia.title} ↗
              </a>
              <span>{wikipedia.license}</span>
            </p>
            <p className="text-xs leading-relaxed text-slate-300">{wikipedia.text}</p>
          </div>
        </div>
      )}
    </section>
  )
}

const VERDICT_STYLE: Record<MoveVerdict['quality'], { bg: string; text: string }> = {
  brilliant: { bg: 'bg-teal-500/20 border-teal-500/60', text: 'text-teal-300' },
  great: { bg: 'bg-sky-600/20 border-sky-600/60', text: 'text-sky-300' },
  best: { bg: 'bg-emerald-600/20 border-emerald-600/60', text: 'text-emerald-300' },
  excellent: { bg: 'bg-emerald-600/15 border-emerald-700/50', text: 'text-emerald-300' },
  good: { bg: 'bg-emerald-600/10 border-emerald-700/50', text: 'text-emerald-300' },
  book: { bg: 'bg-amber-900/25 border-amber-800/60', text: 'text-amber-200' },
  inaccuracy: { bg: 'bg-amber-600/15 border-amber-600/60', text: 'text-amber-300' },
  mistake: { bg: 'bg-orange-600/20 border-orange-600/60', text: 'text-orange-300' },
  miss: { bg: 'bg-rose-500/15 border-rose-500/60', text: 'text-rose-300' },
  blunder: { bg: 'bg-rose-600/20 border-rose-600/60', text: 'text-rose-300' },
}

const NO_BEST_SHOWN = new Set<MoveVerdict['quality']>(['brilliant', 'great', 'best', 'book'])

/**
 * Ecart de theorie : ou se situe le probleme (le coup joue quitte la theorie,
 * combien de fois dans vos parties) et le coup theorique preconise, jouable
 * d'un clic.
 */
function TheoryGapBlock({
  gap,
  onPlay,
  compact,
}: {
  gap: TheoryGap
  onPlay?: (san: string) => void
  compact?: boolean
}) {
  const text = compact ? 'text-[10px]' : 'text-[11px]'
  const head = compact ? 'text-[9px]' : 'text-[10px]'
  const [first, ...others] = gap.expected
  const recurrent = gap.count >= 2
  return (
    <section
      className={`space-y-1 rounded-lg border ${
        recurrent ? 'border-amber-500/70 bg-amber-950/35' : 'border-amber-700/50 bg-amber-950/20'
      } ${compact ? 'p-2' : 'p-2.5'}`}
    >
      <p className={`font-semibold tracking-wide text-amber-400 uppercase ${head}`}>
        {recurrent ? 'Votre faiblesse récurrente' : gap.count === 1 ? 'Écart de théorie déjà commis' : 'Écart de théorie'}
      </p>
      <p className={`leading-snug text-amber-100 ${text}`}>
        {gap.count > 0
          ? `Dans ${gap.count} de vos parties, vous jouez ${gap.san} ici (${gap.losses} défaite${gap.losses > 1 ? 's' : ''}). C’est là que la ligne vous échappe.`
          : `${gap.san} sort de la théorie répertoriée : à partir d’ici, plus de repère.`}
      </p>
      {first ? (
        <p className={`leading-snug text-emerald-200 ${text}`}>
          Coup théorique préconisé : <span className="font-mono font-bold text-emerald-100">{first.san}</span>
          {first.name && <span className="text-emerald-200/80"> — {frName(first.name)}</span>}
          {first.games > 0 && (
            <span className="text-emerald-300/70"> · {first.games.toLocaleString('fr-FR')} parties Lichess</span>
          )}
        </p>
      ) : (
        <p className={`text-amber-200/80 ${text}`}>La théorie répertoriée s’arrête juste avant : ce coup n’est pas forcément fautif.</p>
      )}
      {others.length > 0 && (
        <p className={`text-slate-400 ${text}`}>
          Autres coups théoriques :{' '}
          {others.map((move, index) => (
            <span key={move.san}>
              {index > 0 && ', '}
              <span className="font-mono text-slate-200">{move.san}</span>
              {move.name && <span className="text-slate-500"> ({frName(move.name)})</span>}
            </span>
          ))}
        </p>
      )}
      {onPlay && gap.expected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {gap.expected.slice(0, 3).map((move) => (
            <button
              key={move.san}
              onClick={() => onPlay(move.san)}
              className={`rounded-md border border-emerald-600/70 px-2 py-0.5 font-mono text-emerald-100 hover:bg-emerald-900/40 ${text}`}
              title={`Remplacer ${gap.san} par ${move.san} sur l’échiquier`}
            >
              ▶ {move.san}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/** Pourquoi le coup est fautif : bascule d'evaluation, concessions, meilleur coup, punition. */
function FaultBlock({ fault, compact }: { fault: FaultExplanation; compact?: boolean }) {
  const text = compact ? 'text-[10px]' : 'text-[11px]'
  const head = compact ? 'text-[9px]' : 'text-[10px]'
  return (
    <section
      className={`space-y-1.5 rounded-lg border border-rose-800/60 bg-rose-950/20 ${compact ? 'p-2' : 'p-2.5'}`}
      aria-label={fault.title}
    >
      <p className={`font-semibold tracking-wide text-rose-400 uppercase ${head}`}>{fault.title}</p>
      {fault.swing && <p className={`leading-snug text-rose-100/90 ${text}`}>{fault.swing}</p>}
      {fault.concedes.length > 0 && (
        <ul className="space-y-0.5">
          {fault.concedes.map((point) => (
            <li key={point} className={`flex gap-1.5 leading-snug text-amber-200/90 ${text}`}>
              <span className="shrink-0">▲</span>
              {point}
            </li>
          ))}
        </ul>
      )}
      {fault.better && (
        <div className={`rounded-md border border-emerald-800/50 bg-emerald-950/30 px-2 py-1.5 ${text}`}>
          <p className="text-emerald-200">
            <span className="font-semibold">Il fallait {fault.better.san}</span>
            {fault.better.line !== fault.better.san && (
              <span className="font-mono text-emerald-300/80"> · {fault.better.line}</span>
            )}
          </p>
          {fault.better.reasons.length > 0 && (
            <ul className="mt-0.5 space-y-0.5">
              {fault.better.reasons.map((reason) => (
                <li key={reason} className="flex gap-1.5 leading-snug text-emerald-100/85">
                  <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-emerald-400" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {fault.punishment && (
        <div>
          <p className={`mb-0.5 font-semibold tracking-wide text-rose-400 uppercase ${head}`}>
            Comment l’adversaire en profite
          </p>
          <p className={`font-mono text-slate-200 ${text}`}>{fault.punishment.line}</p>
          <ul className="mt-0.5 space-y-0.5">
            {fault.punishment.points.map((point) => (
              <li key={point} className={`flex gap-1.5 leading-snug text-rose-100/90 ${text}`}>
                <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-rose-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Bandeau de verdict du moteur, avec le coup qu'il aurait joue. */
function Verdict({ verdict, compact }: { verdict: MoveVerdict; compact?: boolean }) {
  const style = VERDICT_STYLE[verdict.quality]
  const badge = QUALITY_BADGE[verdict.quality]
  const showBest = !NO_BEST_SHOWN.has(verdict.quality) && verdict.best
  return (
    <p
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border px-2 py-1 ${style.bg} ${
        compact ? 'text-[10px]' : 'text-[11px]'
      }`}
    >
      <span
        className="inline-flex h-3.5 min-w-3.5 items-center justify-center self-center rounded-full px-0.5 text-[8px] font-bold leading-none"
        style={{ background: badge.color, color: badge.dark ? '#1f2937' : '#fff' }}
        aria-hidden
      >
        <QualityGlyph badge={badge} />
      </span>
      <span className={`font-semibold ${style.text}`}>{verdict.label}</span>
      {verdict.loss >= 20 && <span className="text-slate-400">−{(verdict.loss / 100).toFixed(1)} pion</span>}
      {showBest && (
        <span className="text-slate-400">
          le moteur jouait <span className="font-mono text-slate-200">{verdict.best}</span>
        </span>
      )}
      <span
        className="ml-auto text-[9px] text-slate-500"
        title={`Évaluations ${SOURCE_LABEL[verdict.source]}, profondeur ${verdict.depths[0]} avant / ${verdict.depths[1]} après`}
      >
        {verdict.source === 'cloud' ? '☁' : verdict.source === 'mixed' ? '⚙☁' : '⚙'} prof. {Math.min(...verdict.depths)}
      </span>
    </p>
  )
}

interface Props {
  explanation: MoveExplanation | null
  openingName?: string
  eco?: string
  /** Le coup expliqué sort de l'arbre théorique. */
  outOfBook: boolean
  /** Version resserrée, pour la bulle posée sur l'échiquier. */
  compact?: boolean
  /** Jugement du moteur sur ce coup, quand il est activé. */
  verdict?: MoveVerdict | null
  /** Pourquoi le coup est fautif (imprécision, erreur, occasion manquée, gaffe). */
  fault?: FaultExplanation | null
  /** Score pratique du coup (bilan Lichess face à l'attente du moteur). */
  practical?: PracticalNote | null
  /** Vidéos de Julien Song et Marc Quenehen sur l'ouverture (version complète). */
  videos?: CreatorVideo[]
  /** Sources documentaires (Wikibooks, Wikipédia), version complète seulement. */
  docs?: Docs
  /** Requête d'explication du coup par IA, ancrée sur toutes les sources (coups non fautifs). */
  movePrompt?: string | null
  /** Requête prête pour une explication par IA générative, quand le coup est fautif. */
  aiPrompt?: string | null
  /** Le coup affiché quitte la théorie : où est le problème et quel coup théorique jouer. */
  theoryGap?: TheoryGap | null
  /** Joue un coup théorique à la place de l'écart. */
  onPlayTheory?: (san: string) => void
}

/** « Pourquoi ce coup ? » — commentaire théorique et analyse de la position. */
export default function ExplainPanel({
  explanation,
  openingName,
  eco,
  outOfBook,
  compact,
  verdict,
  fault,
  practical,
  videos,
  docs,
  movePrompt,
  aiPrompt,
  theoryGap,
  onPlayTheory,
}: Props) {
  if (!explanation) {
    return (
      <p className="text-sm text-slate-400">
        Aucun coup joué pour l’instant. Jouez un coup sur l’échiquier ou choisissez une branche dans l’arbre : son
        idée s’affichera ici.
      </p>
    )
  }

  // Bulle survolée : le coup, l'essentiel, et de quoi approfondir
  if (compact) {
    // Pour une faute, les motifs positifs generiques n'ont plus leur place
    const points = fault ? [] : explanation.note ? explanation.points.slice(0, 2) : explanation.points.slice(0, 4)
    return (
      <div className="space-y-1.5">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-mono text-xs font-bold text-slate-100">{explanation.numbered}</span>
          {openingName && (
            <span className="inline-flex min-w-0 items-baseline gap-1 text-[10px] text-slate-400">
              {eco && <span className="shrink-0 text-slate-500">{eco}</span>}
              <OpeningName name={openingName} />
            </span>
          )}
        </p>

        {theoryGap && <TheoryGapBlock gap={theoryGap} onPlay={onPlayTheory} compact />}
        {verdict && <Verdict verdict={verdict} compact />}
        {fault && <FaultBlock fault={fault} compact />}
        {fault && aiPrompt && <AiExplain prompt={aiPrompt} compact />}
        {practical && practical.verdict !== 'sample' && <PracticalBlock note={practical} compact />}

        {explanation.note && (
          <p className="border-l-2 border-emerald-600/70 pl-2 text-[11px] leading-relaxed text-slate-200">
            {explanation.note}
          </p>
        )}

        {points.length > 0 && (
          <ul className="space-y-0.5">
            {points.map((point) => (
              <li key={point} className="flex gap-1.5 text-[11px] leading-snug text-slate-400">
                <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-slate-500" />
                {point}
              </li>
            ))}
          </ul>
        )}

        {explanation.warnings.length > 0 && (
          <ul className="space-y-0.5">
            {explanation.warnings.map((warning) => (
              <li key={warning} className="flex gap-1.5 text-[11px] leading-snug text-amber-300/90">
                <span className="shrink-0">▲</span>
                {warning}
              </li>
            ))}
          </ul>
        )}

        {explanation.plan && (
          <p className="text-[10px] leading-relaxed text-slate-400">
            <span className="text-slate-500">Plan : </span>
            {explanation.plan}
          </p>
        )}

        {outOfBook && <p className="text-[10px] text-amber-400">Coup hors du répertoire Lichess.</p>}

        <a
          href={explanation.wikibooks}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[10px] text-blue-400 hover:text-blue-300"
        >
          Théorie détaillée ↗
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-base font-bold text-slate-100">{explanation.numbered}</span>
        {openingName && (
          <span className="inline-flex min-w-0 items-baseline gap-1 text-xs text-slate-400">
            {eco && <span className="shrink-0 text-slate-500">{eco}</span>}
            <OpeningName name={openingName} />
          </span>
        )}
      </p>

      {theoryGap && <TheoryGapBlock gap={theoryGap} onPlay={onPlayTheory} />}
      {verdict && <Verdict verdict={verdict} />}
      {fault && <FaultBlock fault={fault} />}
      {fault && aiPrompt && <AiExplain prompt={aiPrompt} />}
      {practical && <PracticalBlock note={practical} />}
      {!fault && movePrompt && (
        <AiExplain
          prompt={movePrompt}
          system={MOVE_SYSTEM_PROMPT}
          label="Expliquer ce coup avec l’IA"
          footnote="à partir de la théorie, des statistiques Lichess, des sources et du moteur"
        />
      )}

      {explanation.note && (
        <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-2.5">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">Théorie</p>
          <p className="text-xs leading-relaxed text-slate-200">{explanation.note}</p>
        </section>
      )}

      {!fault && explanation.points.length > 0 && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Ce que le coup apporte
          </p>
          <ul className="space-y-1">
            {explanation.points.map((point) => (
              <li key={point} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {explanation.warnings.length > 0 && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-amber-500/80 uppercase">
            Ce que le coup concède
          </p>
          <ul className="space-y-1">
            {explanation.warnings.map((warning) => (
              <li key={warning} className="flex gap-1.5 text-xs leading-relaxed text-amber-300/90">
                <span className="shrink-0">▲</span>
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      {explanation.plan && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Plan de cette ouverture
          </p>
          <p className="text-xs leading-relaxed text-slate-300">{explanation.plan}</p>
        </section>
      )}

      {outOfBook && (
        <p className="rounded-lg bg-amber-950/25 px-2.5 py-1.5 text-[11px] text-amber-300">
          Ce coup est sorti du répertoire Lichess : seule l’analyse automatique de la position s’applique, complétée
          par le moteur.
        </p>
      )}

      {!explanation.note && !outOfBook && (
        <p className="text-[11px] text-slate-500">
          Aucun commentaire rédigé pour cette ligne : les points ci-dessus sont déduits automatiquement de la
          position.
        </p>
      )}

      {videos && <VideosBlock videos={videos} />}

      {docs ? (
        <DocsBlock docs={docs} />
      ) : (
        <a
          href={explanation.wikibooks}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs text-blue-400 hover:text-blue-300"
        >
          Théorie détaillée sur Wikibooks ↗
        </a>
      )}
    </div>
  )
}
