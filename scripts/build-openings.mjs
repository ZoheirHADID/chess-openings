#!/usr/bin/env node
/**
 * Construit l'arbre des ouvertures a partir du jeu de donnees officiel Lichess
 * (https://github.com/lichess-org/chess-openings, licence CC0).
 *
 * Sortie : src/data/openings.json — un arbre prefixe (trie) des coups SAN ou
 * chaque noeud nomme porte son code ECO et son nom complet.
 *
 * Usage : node scripts/build-openings.mjs [--refresh]
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW_DIR = join(ROOT, 'data', 'raw')
const OUT_FILE = join(ROOT, 'public', 'openings.json')
const FILES = ['a', 'b', 'c', 'd', 'e']
const BASE_URL = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master'
const refresh = process.argv.includes('--refresh')

async function loadTsv(letter) {
  const path = join(RAW_DIR, `${letter}.tsv`)
  if (!refresh && existsSync(path)) return readFileSync(path, 'utf8')
  process.stdout.write(`  telechargement ${letter}.tsv...`)
  const res = await fetch(`${BASE_URL}/${letter}.tsv`)
  if (!res.ok) throw new Error(`${letter}.tsv : HTTP ${res.status}`)
  const text = await res.text()
  mkdirSync(RAW_DIR, { recursive: true })
  writeFileSync(path, text)
  process.stdout.write(' ok\n')
  return text
}

/** "1. e4 c5 2. Nf3" -> ["e4", "c5", "Nf3"] */
function pgnToSan(pgn) {
  return pgn
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.+/, '').trim())
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
}

/** Decoupe "Sicilian Defense: Najdorf, English Attack" en famille + variante */
function splitName(name) {
  const idx = name.indexOf(':')
  if (idx === -1) return { family: name, variation: '' }
  return { family: name.slice(0, idx).trim(), variation: name.slice(idx + 1).trim() }
}

const newNode = (san) => ({ s: san, c: [] })

async function main() {
  console.log('Construction de l\'arbre des ouvertures Lichess')
  const rows = []
  for (const letter of FILES) {
    const tsv = await loadTsv(letter)
    const lines = tsv.split('\n').slice(1)
    for (const line of lines) {
      if (!line.trim()) continue
      const [eco, name, pgn] = line.split('\t')
      if (!eco || !name || !pgn) continue
      rows.push({ eco: eco.trim(), name: name.trim(), san: pgnToSan(pgn) })
    }
  }
  rows.sort((a, b) => a.san.length - b.san.length || a.name.localeCompare(b.name))
  console.log(`  ${rows.length} ouvertures lues`)

  const root = newNode('')
  const index = []
  let maxDepth = 0

  for (const row of rows) {
    let node = root
    for (const san of row.san) {
      let child = node.c.find((n) => n.s === san)
      if (!child) {
        child = newNode(san)
        node.c.push(child)
      }
      node = child
    }
    if (node.n) continue // doublon exact : on garde le premier nom
    const { family, variation } = splitName(row.name)
    node.e = row.eco
    node.n = row.name
    node.f = family
    if (variation) node.va = variation
    maxDepth = Math.max(maxDepth, row.san.length)
    index.push({ eco: row.eco, name: row.name, family, path: row.san.join(' ') })
  }

  // v = nombre d'ouvertures nommees dans le sous-arbre, tri des enfants par richesse
  const annotate = (node) => {
    let total = node.n ? 1 : 0
    for (const child of node.c) total += annotate(child)
    node.v = total
    node.c.sort((a, b) => b.v - a.v || a.s.localeCompare(b.s))
    if (node.c.length === 0) delete node.c
    return total
  }
  annotate(root)

  const countNodes = (n) => 1 + (n.c ? n.c.reduce((s, c) => s + countNodes(c), 0) : 0)

  const payload = {
    version: 1,
    source: 'lichess-org/chess-openings (CC0)',
    generatedAt: new Date().toISOString().slice(0, 10),
    openings: rows.length,
    nodes: countNodes(root) - 1,
    maxDepth,
    root,
    index,
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(payload))
  const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(0)
  console.log(`  ${payload.nodes} noeuds, profondeur max ${maxDepth}`)
  console.log(`  ecrit : public/openings.json (${kb} Ko)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
