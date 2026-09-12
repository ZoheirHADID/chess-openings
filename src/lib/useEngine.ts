import { useEffect, useState } from 'react'
import { engine, type EngineSnapshot } from './engine'

/**
 * Branche le moteur sur une position. L'analyse redemarre a chaque changement de
 * FEN et s'arrete des que le moteur est desactive. Moteur desactive, les
 * evaluations d'arriere-plan (jugement du dernier coup) continuent de tourner.
 */
export function useEngine(fen: string, enabled: boolean, depth = 16): EngineSnapshot | null {
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null)

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null)
      return
    }
    const unsubscribe = engine.subscribe(setSnapshot)
    void engine.analyse(fen, depth)
    return () => {
      unsubscribe()
      engine.stop()
    }
  }, [fen, enabled, depth])

  return snapshot
}
