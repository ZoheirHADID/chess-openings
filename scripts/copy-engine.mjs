#!/usr/bin/env node
/**
 * Copie le moteur Stockfish (WASM, GPL-3.0) depuis node_modules vers public/engine/.
 * Variante « lite single-thread » : ~7 Mo, aucun en-tete COOP/COEP requis.
 */
import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'node_modules', 'stockfish', 'bin')
const DEST = join(ROOT, 'public', 'engine')

if (!existsSync(SRC)) {
  console.warn('  stockfish absent de node_modules : moteur non copie')
  process.exit(0)
}

mkdirSync(DEST, { recursive: true })
const wanted = readdirSync(SRC).filter((f) => f.startsWith('stockfish-18-lite-single'))
for (const file of wanted) {
  const target = join(DEST, file)
  const source = join(SRC, file)
  if (existsSync(target) && statSync(target).size === statSync(source).size) continue
  copyFileSync(source, target)
  console.log(`  copie : public/engine/${file} (${(statSync(target).size / 1024 / 1024).toFixed(1)} Mo)`)
}
console.log(`  moteur pret (${wanted.length} fichier(s))`)
