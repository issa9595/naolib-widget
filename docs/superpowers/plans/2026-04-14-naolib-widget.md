# Naolib Widget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un widget React "État du réseau & perturbations" pour Naolib dans un projet Vite démo, avec un seul fichier `NaolibWidget.jsx` autonome et intégrable.

**Architecture:** Un seul fichier `src/NaolibWidget.jsx` contient le hook `useFetch`, les fonctions utilitaires pures, les données mock, tous les sous-composants internes, et l'export default. Le projet Vite sert uniquement de démo.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Vitest (dev only pour les tests des fonctions pures)

---

## Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `package.json` | Dépendances et scripts |
| `vite.config.js` | Configuration Vite + plugin React |
| `tailwind.config.js` | Configuration Tailwind (paths content) |
| `postcss.config.js` | PostCSS avec Tailwind + autoprefixer |
| `index.html` | Point d'entrée HTML |
| `src/main.jsx` | Bootstrap React |
| `src/index.css` | Directives Tailwind |
| `src/App.jsx` | Démo minimaliste |
| `src/NaolibWidget.jsx` | **Livrable principal** |
| `src/NaolibWidget.test.js` | Tests Vitest des fonctions pures |
| `README.md` | Instructions d'utilisation |

---

## Task 1 : Bootstrap du projet Vite + React + Tailwind

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/index.css`

- [ ] **Step 1 : Créer `package.json`**

```json
{
  "name": "naolib-widget",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2 : Installer les dépendances**

```bash
cd /Users/madayev/Dev/naolib && npm install
```

Expected: `node_modules/` créé, pas d'erreur.

- [ ] **Step 3 : Créer `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4 : Créer `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5 : Créer `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6 : Créer `index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Naolib — État du réseau</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7 : Créer `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8 : Créer `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9 : Créer `src/App.jsx` (placeholder temporaire)**

```jsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <p className="text-gray-500">Widget à venir…</p>
    </div>
  )
}
```

- [ ] **Step 10 : Vérifier que le projet démarre**

```bash
cd /Users/madayev/Dev/naolib && npm run dev
```

Expected: serveur Vite sur `http://localhost:5173`, page affiche "Widget à venir…"

- [ ] **Step 11 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git init && git add . && git commit -m "chore: bootstrap Vite + React + Tailwind project"
```

---

## Task 2 : Fonctions utilitaires pures + données mock (TDD)

**Files:**
- Create: `src/NaolibWidget.jsx` (squelette avec exports des fonctions pures)
- Create: `src/NaolibWidget.test.js`

Ces fonctions sont exportées nommément depuis `NaolibWidget.jsx` pour être testables, en plus de l'export default du composant.

- [ ] **Step 1 : Créer le squelette de `src/NaolibWidget.jsx` avec les fonctions pures et le mock**

```jsx
import { useState, useEffect } from 'react'

// ─── Données mock ────────────────────────────────────────────────────────────

export const MOCK_DATA = [
  {
    id: 'mock-1',
    type: 'travaux',
    transport: 'tram',
    lines: ['Tram 1'],
    title: 'Interruption partielle ligne 1',
    description: 'Travaux de maintenance entre Manufacture et Commerce. Bus de substitution mis en place.',
    startDate: '2026-04-14T08:00:00',
    endDate: '2026-04-15T18:00:00',
  },
  {
    id: 'mock-2',
    type: 'deviation',
    transport: 'tram',
    lines: ['Tram 2'],
    title: 'Déviation suite à événement place Royale',
    description: 'La ligne Tram 2 est déviée en raison d\'un événement culturel place Royale.',
    startDate: '2026-04-14T10:00:00',
    endDate: '2026-04-14T23:00:00',
  },
  {
    id: 'mock-3',
    type: 'incident',
    transport: 'bus',
    lines: ['C1'],
    title: 'Retards importants — accident sur le parcours',
    description: 'Accident sur le boulevard de Verdun provoquant des retards de 15 à 25 minutes.',
    startDate: '2026-04-14T07:30:00',
    endDate: '2026-04-14T12:00:00',
  },
  {
    id: 'mock-4',
    type: 'travaux',
    transport: 'bus',
    lines: ['C6'],
    title: 'Arrêts supprimés — travaux de voirie',
    description: 'Les arrêts Bellevue et Chézine sont supprimés du 14 au 18 avril.',
    startDate: '2026-04-14T00:00:00',
    endDate: '2026-04-18T23:59:00',
  },
  {
    id: 'mock-5',
    type: 'incident',
    transport: 'navibus',
    lines: ['N'],
    title: 'Service réduit — conditions météo défavorables',
    description: 'En raison des vents forts sur la Loire, le Navibus circule avec des fréquences réduites.',
    startDate: '2026-04-14T06:00:00',
    endDate: '2026-04-14T20:00:00',
  },
]

// ─── Fonctions utilitaires pures ──────────────────────────────────────────────

function detectTransport(lines) {
  const joined = lines.join(' ').toLowerCase()
  if (joined.includes('tram')) return 'tram'
  if (joined.includes('navibus') || joined.includes('bateau')) return 'navibus'
  return 'bus'
}

function normalizeType(raw) {
  const t = (raw || '').toLowerCase()
  if (t.includes('trav')) return 'travaux'
  if (t.includes('inci') || t.includes('panne') || t.includes('pertub')) return 'incident'
  if (t.includes('dév') || t.includes('dev')) return 'deviation'
  return 'autre'
}

export function normalizeRecord(record) {
  const fields = record.fields || record
  const linesRaw = fields.lines || fields.lignes || ''
  const lines = typeof linesRaw === 'string'
    ? linesRaw.split(',').map(l => l.trim()).filter(Boolean)
    : Array.isArray(linesRaw) ? linesRaw : []

  return {
    id: record.recordid || record.id || String(Math.random()),
    type: normalizeType(fields.type || fields.typeevenement || ''),
    transport: detectTransport(lines),
    lines,
    title: fields.title || fields.titre || 'Perturbation',
    description: fields.description || '',
    startDate: fields.startdate || fields.datedebut || '',
    endDate: fields.enddate || fields.datefin || '',
  }
}

export function getNetworkStatus(disruptions) {
  if (disruptions.length === 0) return 'normal'
  if (disruptions.length <= 2) return 'perturbed'
  return 'heavily_perturbed'
}

export function filterDisruptions(disruptions, filter) {
  if (filter === 'all') return disruptions
  return disruptions.filter(d => d.transport === filter)
}

// ─── Composant principal (placeholder) ───────────────────────────────────────

export default function NaolibWidget() {
  return <div>NaolibWidget</div>
}
```

- [ ] **Step 2 : Créer `src/NaolibWidget.test.js` avec les tests**

```js
import { describe, it, expect } from 'vitest'
import { normalizeRecord, getNetworkStatus, filterDisruptions, MOCK_DATA } from './NaolibWidget.jsx'

describe('normalizeRecord', () => {
  it('normalise un record API ODS avec fields imbriqués', () => {
    const record = {
      recordid: 'abc-123',
      fields: {
        title: 'Travaux ligne 1',
        description: 'Description courte',
        type: 'travaux',
        lines: 'Tram 1, Tram 2',
        startdate: '2026-04-14T08:00:00',
        enddate: '2026-04-15T18:00:00',
      },
    }
    const result = normalizeRecord(record)
    expect(result.id).toBe('abc-123')
    expect(result.title).toBe('Travaux ligne 1')
    expect(result.type).toBe('travaux')
    expect(result.transport).toBe('tram')
    expect(result.lines).toEqual(['Tram 1', 'Tram 2'])
    expect(result.startDate).toBe('2026-04-14T08:00:00')
    expect(result.endDate).toBe('2026-04-15T18:00:00')
  })

  it('détecte le transport navibus', () => {
    const record = {
      fields: { lines: 'Navibus N', type: 'incident', title: 'Test' },
    }
    expect(normalizeRecord(record).transport).toBe('navibus')
  })

  it('fallback transport = bus si pas de tram ni navibus', () => {
    const record = {
      fields: { lines: 'C1', type: 'incident', title: 'Test' },
    }
    expect(normalizeRecord(record).transport).toBe('bus')
  })

  it('normalise le type deviation', () => {
    const record = { fields: { lines: 'C1', type: 'déviation', title: 'Test' } }
    expect(normalizeRecord(record).type).toBe('deviation')
  })

  it('type fallback = autre si inconnu', () => {
    const record = { fields: { lines: 'C1', type: 'inconnu', title: 'Test' } }
    expect(normalizeRecord(record).type).toBe('autre')
  })
})

describe('getNetworkStatus', () => {
  it('retourne normal si 0 perturbations', () => {
    expect(getNetworkStatus([])).toBe('normal')
  })

  it('retourne perturbed si 1 perturbation', () => {
    expect(getNetworkStatus([MOCK_DATA[0]])).toBe('perturbed')
  })

  it('retourne perturbed si 2 perturbations', () => {
    expect(getNetworkStatus([MOCK_DATA[0], MOCK_DATA[1]])).toBe('perturbed')
  })

  it('retourne heavily_perturbed si 3+ perturbations', () => {
    expect(getNetworkStatus(MOCK_DATA)).toBe('heavily_perturbed')
  })
})

describe('filterDisruptions', () => {
  it('retourne tout si filter = all', () => {
    expect(filterDisruptions(MOCK_DATA, 'all')).toHaveLength(5)
  })

  it('filtre par tram', () => {
    const result = filterDisruptions(MOCK_DATA, 'tram')
    expect(result.every(d => d.transport === 'tram')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filtre par bus', () => {
    const result = filterDisruptions(MOCK_DATA, 'bus')
    expect(result.every(d => d.transport === 'bus')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filtre par navibus', () => {
    const result = filterDisruptions(MOCK_DATA, 'navibus')
    expect(result.every(d => d.transport === 'navibus')).toBe(true)
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils passent**

```bash
cd /Users/madayev/Dev/naolib && npm test
```

Expected: 14 tests PASS, 0 FAIL

- [ ] **Step 4 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git add src/NaolibWidget.jsx src/NaolibWidget.test.js && git commit -m "feat: add pure utility functions, mock data, and unit tests"
```

---

## Task 3 : Hook `useFetch` avec auto-refresh et fallback mock

**Files:**
- Modify: `src/NaolibWidget.jsx` — remplacer le placeholder par le hook complet

- [ ] **Step 1 : Remplacer le commentaire `// ─── Composant principal (placeholder)` dans `NaolibWidget.jsx` par le hook + le composant stub**

Remplacer la section à partir de `// ─── Composant principal (placeholder) ───` jusqu'à la fin du fichier par :

```jsx
// ─── Hook de fetch ────────────────────────────────────────────────────────────

const API_URL =
  'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_info-trafic-tan-temps-reel/records?limit=20'

function useFetch() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  async function fetchData() {
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const normalized = (json.results || []).map(normalizeRecord)
      setData(normalized)
      setIsMock(false)
    } catch {
      setData(MOCK_DATA)
      setIsMock(true)
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [])

  return { data, loading, isMock, lastUpdate, refresh: fetchData }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NaolibWidget() {
  const { data, loading, isMock, lastUpdate, refresh } = useFetch()

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto">
      <p>Chargement: {loading ? 'oui' : 'non'} — {data.length} perturbations</p>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier que les tests passent toujours**

```bash
cd /Users/madayev/Dev/naolib && npm test
```

Expected: 14 tests PASS

- [ ] **Step 3 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git add src/NaolibWidget.jsx && git commit -m "feat: add useFetch hook with auto-refresh and mock fallback"
```

---

## Task 4 : Composants internes Header, GlobalStatus, MockBanner

**Files:**
- Modify: `src/NaolibWidget.jsx` — ajouter les sous-composants et les helpers de formatage

- [ ] **Step 1 : Ajouter les helpers de formatage et les sous-composants Header, GlobalStatus, MockBanner juste avant `// ─── Hook de fetch`**

```jsx
// ─── Helpers de formatage ─────────────────────────────────────────────────────

function formatTime(date) {
  if (!date) return '--:--'
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (isNaN(d)) return isoString
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function Header({ lastUpdate, onRefresh, loading }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span style={{ color: '#003189' }} className="text-xl font-bold">État du réseau</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">
          Mis à jour {formatTime(lastUpdate)}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Rafraîchir"
          aria-label="Rafraîchir les données"
        >
          <svg
            className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  normal: {
    label: 'Trafic normal',
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  perturbed: {
    label: 'Réseau perturbé',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
  },
  heavily_perturbed: {
    label: 'Réseau fortement perturbé',
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
}

function GlobalStatus({ status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} ${cfg.text} mb-4 text-sm font-medium`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </div>
  )
}

function MockBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-xs text-yellow-700">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      Données simulées — API indisponible
    </div>
  )
}
```

- [ ] **Step 2 : Mettre à jour le composant `NaolibWidget` pour utiliser ces sous-composants**

Remplacer le corps de `NaolibWidget` par :

```jsx
export default function NaolibWidget() {
  const [filter, setFilter] = useState('all')
  const { data, loading, isMock, lastUpdate, refresh } = useFetch()
  const filtered = filterDisruptions(data, filter)
  const status = getNetworkStatus(filtered)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />
      {isMock && <MockBanner />}
      <GlobalStatus status={status} />
      <p className="text-sm text-gray-400">{filtered.length} perturbation(s) — filtre: {filter}</p>
    </div>
  )
}
```

- [ ] **Step 3 : Mettre à jour `src/App.jsx` pour monter le widget**

```jsx
import NaolibWidget from './NaolibWidget.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-2xl">
        <NaolibWidget />
      </div>
    </div>
  )
}
```

- [ ] **Step 4 : Vérifier visuellement dans le navigateur**

```bash
cd /Users/madayev/Dev/naolib && npm run dev
```

Expected: widget avec header, badge d'état, bannière mock si API indispo.

- [ ] **Step 5 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git add src/NaolibWidget.jsx src/App.jsx && git commit -m "feat: add Header, GlobalStatus, MockBanner sub-components"
```

---

## Task 5 : FilterBar + SkeletonCard + EmptyState

**Files:**
- Modify: `src/NaolibWidget.jsx` — ajouter les sous-composants de filtre et états vides

- [ ] **Step 1 : Ajouter FilterBar, SkeletonCard, EmptyState juste avant `// ─── Hook de fetch`**

```jsx
const FILTERS = [
  { value: 'all', label: 'Tout' },
  { value: 'tram', label: 'Tram' },
  { value: 'bus', label: 'Bus' },
  { value: 'navibus', label: 'Navibus' },
]

function FilterBar({ active, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label="Filtrer par type de transport">
      {FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            active === f.value
              ? 'text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={active === f.value ? { backgroundColor: '#003189' } : {}}
          aria-pressed={active === f.value}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-100 p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-5 w-12 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-full mb-1" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-green-700 bg-green-50 rounded-xl">
      <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="font-semibold text-base">Trafic normal sur l'ensemble du réseau</p>
      <p className="text-sm text-green-600 mt-1">Aucune perturbation en cours</p>
    </div>
  )
}
```

- [ ] **Step 2 : Mettre à jour `NaolibWidget` pour intégrer FilterBar, SkeletonCard, EmptyState**

```jsx
export default function NaolibWidget() {
  const [filter, setFilter] = useState('all')
  const { data, loading, isMock, lastUpdate, refresh } = useFetch()
  const filtered = filterDisruptions(data, filter)
  const status = getNetworkStatus(filtered)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />
      {isMock && <MockBanner />}
      <GlobalStatus status={status} />
      <FilterBar active={filter} onChange={setFilter} />
      {loading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <p className="text-sm text-gray-400">{filtered.length} perturbation(s) — DisruptionCards à venir</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier dans le navigateur**

```bash
cd /Users/madayev/Dev/naolib && npm run dev
```

Expected: skeleton animé pendant 1–2s au chargement, puis filtres + statut. Si API OK → liste vide placeholder. Si API KO → mock banner + cards placeholder.

- [ ] **Step 4 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git add src/NaolibWidget.jsx && git commit -m "feat: add FilterBar, SkeletonCard, EmptyState sub-components"
```

---

## Task 6 : DisruptionCard + assemblage final

**Files:**
- Modify: `src/NaolibWidget.jsx` — ajouter DisruptionCard et finaliser NaolibWidget

- [ ] **Step 1 : Ajouter les configs de couleurs et DisruptionCard juste avant `// ─── Hook de fetch`**

```jsx
const TYPE_CONFIG = {
  travaux: { label: 'Travaux', bg: '#F9A825', text: '#5D3900' },
  incident: { label: 'Incident', bg: '#C62828', text: '#ffffff' },
  deviation: { label: 'Déviation', bg: '#6A1B9A', text: '#ffffff' },
  autre: { label: 'Autre', bg: '#757575', text: '#ffffff' },
}

const TRANSPORT_CONFIG = {
  tram: { bg: '#003189', text: '#ffffff' },
  bus: { bg: '#2E7D32', text: '#ffffff' },
  navibus: { bg: '#E65100', text: '#ffffff' },
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.autre
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}

function LineBadge({ line, transport }) {
  const cfg = TRANSPORT_CONFIG[transport] || TRANSPORT_CONFIG.bus
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {line}
    </span>
  )
}

function DisruptionCard({ disruption }) {
  const { type, transport, lines, title, description, startDate, endDate } = disruption
  return (
    <div className="rounded-lg border border-gray-100 hover:border-gray-200 p-4 transition-colors">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <TypeBadge type={type} />
        {lines.map(line => (
          <LineBadge key={line} line={line} transport={transport} />
        ))}
      </div>
      <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{description}</p>
      )}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Du {formatDate(startDate)}</span>
        {endDate && <span>au {formatDate(endDate)}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Remplacer le composant `NaolibWidget` par la version finale complète**

```jsx
export default function NaolibWidget() {
  const [filter, setFilter] = useState('all')
  const { data, loading, isMock, lastUpdate, refresh } = useFetch()
  const filtered = filterDisruptions(data, filter)
  const status = getNetworkStatus(filtered)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto font-sans">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />
      {isMock && <MockBanner />}
      <GlobalStatus status={status} />
      <FilterBar active={filter} onChange={setFilter} />
      {loading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(d => (
            <DisruptionCard key={d.id} disruption={d} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

```bash
cd /Users/madayev/Dev/naolib && npm run dev
```

Expected :
- Skeleton pendant le chargement
- Si API KO → bannière mock jaune + 5 cards de perturbations
- Filtres fonctionnels (Tram → 2 cards, Bus → 2 cards, Navibus → 1 card)
- Badge GlobalStatus change selon le filtre
- Bouton refresh rafraîchit les données
- Grille 2 colonnes sur desktop, 1 colonne sur mobile

- [ ] **Step 4 : Vérifier que les tests passent toujours**

```bash
cd /Users/madayev/Dev/naolib && npm test
```

Expected: 14 tests PASS

- [ ] **Step 5 : Commit**

```bash
cd /Users/madayev/Dev/naolib && git add src/NaolibWidget.jsx && git commit -m "feat: add DisruptionCard with type/transport badges, finalize NaolibWidget"
```

---

## Task 7 : README et push vers GitHub

**Files:**
- Create: `README.md`

- [ ] **Step 1 : Créer `README.md`**

```markdown
# Naolib Widget — État du réseau & perturbations

Widget React autonome affichant les perturbations en temps réel du réseau Naolib (Nantes Métropole).

## Démo rapide

```bash
git clone https://github.com/issa9595/naolib-widget.git
cd naolib-widget
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## Intégration dans votre projet

Copiez `src/NaolibWidget.jsx` dans votre projet React + Tailwind CSS :

```jsx
import NaolibWidget from './NaolibWidget'

export default function App() {
  return <NaolibWidget />
}
```

**Prérequis :** React 18+, Tailwind CSS 3+

## Fonctionnalités

- Perturbations en temps réel via l'Open Data Nantes Métropole
- Fallback automatique sur des données simulées si l'API est indisponible
- Rafraîchissement automatique toutes les 60 secondes
- Filtre par type de transport : Tram, Bus, Navibus
- Indicateur global d'état du réseau
- Responsive mobile-first

## Source des données

[Open Data Nantes Métropole — Info-trafic TAN temps réel](https://data.nantesmetropole.fr/explore/dataset/244400404_info-trafic-tan-temps-reel/)
```

- [ ] **Step 2 : Vérifier le build de production**

```bash
cd /Users/madayev/Dev/naolib && npm run build
```

Expected: dossier `dist/` créé sans erreur.

- [ ] **Step 3 : Ajouter le remote GitHub et pousser**

```bash
cd /Users/madayev/Dev/naolib && git remote add origin https://github.com/issa9595/naolib-widget.git && git add README.md && git commit -m "docs: add README with setup and integration instructions" && git push -u origin main
```

Expected: push réussi sur `https://github.com/issa9595/naolib-widget`

---

## Self-review

**Couverture spec :**
- [x] En-tête avec heure MAJ + bouton refresh → `Header`
- [x] Indicateur global Normal/Perturbé/Fortement perturbé → `GlobalStatus` + `getNetworkStatus`
- [x] Liste perturbations avec badge type, ligne, titre, description, dates → `DisruptionCard`
- [x] Filtre Tram/Bus/Navibus/Tout → `FilterBar` + `filterDisruptions`
- [x] Message rassurant si 0 perturbation → `EmptyState`
- [x] État de chargement skeleton → `SkeletonCard`
- [x] Gestion erreur API → fallback mock + `MockBanner`
- [x] Auto-refresh 60s → `setInterval` dans `useFetch`
- [x] Responsive mobile-first → `grid-cols-1 md:grid-cols-2`
- [x] Couleurs Naolib `#003189` → inline styles ciblés
- [x] Fichier unique `.jsx` autonome → tout dans `NaolibWidget.jsx`
- [x] Export default `NaolibWidget` → ✓

**Placeholders :** aucun TBD ni "implement later"

**Cohérence types :** `normalizeRecord` → `Disruption` → `filterDisruptions` → `DisruptionCard` : la propriété `transport` est `'tram' | 'bus' | 'navibus'` partout, `type` est `'travaux' | 'incident' | 'deviation' | 'autre'` partout.
