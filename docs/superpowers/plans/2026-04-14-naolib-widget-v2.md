# NaolibWidget v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter criticité visuelle, accordéon sur les cartes, et filtres avancés (statut, durée, favoris) dans `NaolibWidget.jsx`.

**Architecture:** Fichier unique autonome `NaolibWidget.jsx` enrichi — helpers purs en tête, nouveaux composants internes, état géré dans `NaolibWidget`. Les fonctions pures (`getCriticality`, `applyFilters`) sont exportées et testées avec Vitest.

**Tech Stack:** React 18, Tailwind CSS, Vitest, Vite — aucune dépendance ajoutée.

---

## File Map

| Fichier | Modifications |
|---------|--------------|
| `src/NaolibWidget.jsx` | + `getCriticality`, `CRITICALITY_CONFIG`, `CriticalityBadge`, `applyFilters` ; mise à jour `normalizeRecord`, `DisruptionCard`, `FilterBar`, `GlobalStatus`, `NaolibWidget` |
| `src/NaolibWidget.test.js` | + tests `getCriticality` (via `normalizeRecord`), `applyFilters` ; mise à jour imports |

---

## Task 1 : getCriticality + champ `criticality` dans normalizeRecord

**Files:**
- Modify: `src/NaolibWidget.jsx` (après `normalizeType`, avant `normalizeRecord`)
- Test: `src/NaolibWidget.test.js`

- [ ] **Étape 1 : Écrire les tests qui vont échouer**

Dans `src/NaolibWidget.test.js`, ajouter après le bloc `describe('normalizeRecord', ...)` existant :

```js
describe('normalizeRecord — criticality', () => {
  it('criticality = critique pour type incident', () => {
    const record = {
      code: '1',
      intitule: 'Incident ligne',
      troncons: '[TE1/1/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '08:00',
    }
    expect(normalizeRecord(record).criticality).toBe('critique')
  })

  it('criticality = majeure pour type travaux', () => {
    const record = {
      code: '2',
      intitule: 'Travaux station',
      troncons: '[C1/1/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '08:00',
    }
    expect(normalizeRecord(record).criticality).toBe('majeure')
  })

  it('criticality = mineure pour type deviation', () => {
    const record = {
      code: '3',
      intitule: 'Déviation ligne',
      troncons: '[C6/1/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '08:00',
    }
    expect(normalizeRecord(record).criticality).toBe('mineure')
  })

  it('criticality = mineure pour type autre', () => {
    const record = { fields: { lines: 'C1', type: 'inconnu', title: 'Test' } }
    expect(normalizeRecord(record).criticality).toBe('mineure')
  })
})
```

- [ ] **Étape 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
npm test
```

Attendu : FAIL — `Cannot read properties of undefined (reading 'criticality')`

- [ ] **Étape 3 : Implémenter `getCriticality` et mettre à jour `normalizeRecord`**

Dans `src/NaolibWidget.jsx`, ajouter après la fonction `normalizeType` (ligne ~41) :

```js
function getCriticality(type) {
  if (type === 'incident') return 'critique'
  if (type === 'travaux') return 'majeure'
  return 'mineure'
}
```

Dans `normalizeRecord`, dans l'objet `return` (ligne ~82), ajouter le champ après `isFinished` :

```js
  return {
    id: record.code || record.recordid || record.id || `${title}-${startDate}`,
    type: normalizeType(fields.type || fields.typeevenement || fields.intitule || ''),
    transport,
    lines,
    title,
    description: fields.resume || fields.description || '',
    startDate,
    endDate,
    isFinished,
    criticality: getCriticality(normalizeType(fields.type || fields.typeevenement || fields.intitule || '')),
  }
```

- [ ] **Étape 4 : Lancer les tests — vérifier qu'ils passent**

```bash
npm test
```

Attendu : PASS sur tous les tests du bloc `normalizeRecord — criticality`

- [ ] **Étape 5 : Commit**

```bash
git add src/NaolibWidget.jsx src/NaolibWidget.test.js
git commit -m "feat: add criticality field to normalizeRecord (getCriticality)"
```

---

## Task 2 : applyFilters (transport + statut + durée + favoris + tri)

**Files:**
- Modify: `src/NaolibWidget.jsx` (après `filterDisruptions`)
- Test: `src/NaolibWidget.test.js`

- [ ] **Étape 1 : Écrire les tests qui vont échouer**

Dans `src/NaolibWidget.test.js`, ajouter l'import `applyFilters` :

```js
import { describe, it, expect } from 'vitest'
import { normalizeRecord, getNetworkStatus, filterDisruptions, applyFilters } from './NaolibWidget.jsx'
```

Ajouter les fixtures enrichies et le bloc de tests à la fin du fichier :

```js
// Fixtures enrichies avec criticality, startDate, endDate
const NOW = new Date('2026-04-14T12:00:00')
const PAST = '2026-04-14T08:00:00'
const FUTURE_2H = '2026-04-14T14:30:00'  // maintenant + 2.5h
const FUTURE_1H = '2026-04-14T13:00:00'  // maintenant + 1h
const FUTURE_NEXT_DAY = '2026-04-15T08:00:00'

const makeDisruption = (overrides) => ({
  id: 'd1',
  type: 'incident',
  transport: 'tram',
  lines: ['Tram 1'],
  title: 'Test',
  description: '',
  startDate: PAST,
  endDate: FUTURE_2H,
  isFinished: false,
  criticality: 'critique',
  ...overrides,
})

describe('applyFilters', () => {
  describe('filtre transport', () => {
    it('retourne tout si transport = all', () => {
      const data = [
        makeDisruption({ id: '1', transport: 'tram' }),
        makeDisruption({ id: '2', transport: 'bus' }),
      ]
      expect(applyFilters(data, { transport: 'all' })).toHaveLength(2)
    })

    it('filtre par transport tram', () => {
      const data = [
        makeDisruption({ id: '1', transport: 'tram' }),
        makeDisruption({ id: '2', transport: 'bus' }),
      ]
      const result = applyFilters(data, { transport: 'tram' })
      expect(result).toHaveLength(1)
      expect(result[0].transport).toBe('tram')
    })
  })

  describe('filtre statut', () => {
    it('retourne tout si status = all', () => {
      const data = [
        makeDisruption({ id: '1', startDate: PAST, endDate: FUTURE_2H }),
        makeDisruption({ id: '2', startDate: FUTURE_NEXT_DAY, endDate: '' }),
      ]
      expect(applyFilters(data, { status: 'all' }, NOW)).toHaveLength(2)
    })

    it('filtre en_cours : startDate <= now et endDate > now', () => {
      const data = [
        makeDisruption({ id: '1', startDate: PAST, endDate: FUTURE_2H }),
        makeDisruption({ id: '2', startDate: FUTURE_NEXT_DAY, endDate: '' }),
      ]
      const result = applyFilters(data, { status: 'en_cours' }, NOW)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('filtre a_venir : startDate > now', () => {
      const data = [
        makeDisruption({ id: '1', startDate: PAST, endDate: FUTURE_2H }),
        makeDisruption({ id: '2', startDate: FUTURE_NEXT_DAY, endDate: '' }),
      ]
      const result = applyFilters(data, { status: 'a_venir' }, NOW)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })
  })

  describe('filtre durée', () => {
    it('filtre courte : durée < 2h', () => {
      const data = [
        makeDisruption({ id: '1', startDate: PAST, endDate: FUTURE_1H }),   // 5h → non
        makeDisruption({ id: '2', startDate: PAST, endDate: FUTURE_2H }),   // 6.5h → non
      ]
      // PAST = 08:00, FUTURE_1H = 13:00 → 5h → pas courte
      // Pour avoir une courte : startDate=12:00 endDate=12:30
      const short = makeDisruption({ id: '3', startDate: '2026-04-14T12:00:00', endDate: '2026-04-14T12:30:00' })
      const result = applyFilters([...data, short], { duration: 'courte' }, NOW)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('filtre longue : durée >= 2h', () => {
      const short = makeDisruption({ id: '1', startDate: '2026-04-14T12:00:00', endDate: '2026-04-14T12:30:00' })
      const long = makeDisruption({ id: '2', startDate: '2026-04-14T08:00:00', endDate: '2026-04-14T14:00:00' })
      const result = applyFilters([short, long], { duration: 'longue' }, NOW)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('filtre journee : durée >= 8h ou pas de endDate', () => {
      const noEnd = makeDisruption({ id: '1', startDate: PAST, endDate: '' })
      const short = makeDisruption({ id: '2', startDate: '2026-04-14T12:00:00', endDate: '2026-04-14T12:30:00' })
      const fullDay = makeDisruption({ id: '3', startDate: '2026-04-14T06:00:00', endDate: '2026-04-14T18:00:00' })
      const result = applyFilters([noEnd, short, fullDay], { duration: 'journee' }, NOW)
      expect(result.map(r => r.id).sort()).toEqual(['1', '3'])
    })

    it('exclut des filtres courte/longue si endDate absent', () => {
      const noEnd = makeDisruption({ id: '1', startDate: PAST, endDate: '' })
      expect(applyFilters([noEnd], { duration: 'courte' }, NOW)).toHaveLength(0)
      expect(applyFilters([noEnd], { duration: 'longue' }, NOW)).toHaveLength(0)
    })
  })

  describe('filtre favoris', () => {
    it('retourne tout si favorites vide', () => {
      const data = [makeDisruption({ id: '1', lines: ['Tram 1'] })]
      expect(applyFilters(data, { favorites: new Set() })).toHaveLength(1)
    })

    it('filtre par ligne favorite', () => {
      const data = [
        makeDisruption({ id: '1', lines: ['Tram 1'] }),
        makeDisruption({ id: '2', lines: ['C6'] }),
      ]
      const result = applyFilters(data, { favorites: new Set(['Tram 1']) })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('inclut si au moins une ligne est favorite', () => {
      const d = makeDisruption({ id: '1', lines: ['Tram 1', 'C6'] })
      expect(applyFilters([d], { favorites: new Set(['C6']) })).toHaveLength(1)
    })
  })

  describe('tri par criticité', () => {
    it('trie critique > majeure > mineure', () => {
      const data = [
        makeDisruption({ id: 'min', criticality: 'mineure' }),
        makeDisruption({ id: 'crit', criticality: 'critique' }),
        makeDisruption({ id: 'maj', criticality: 'majeure' }),
      ]
      const result = applyFilters(data, {})
      expect(result.map(r => r.id)).toEqual(['crit', 'maj', 'min'])
    })
  })
})
```

- [ ] **Étape 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
npm test
```

Attendu : FAIL — `applyFilters is not a function` (ou import error)

- [ ] **Étape 3 : Implémenter `applyFilters` et l'exporter**

Dans `src/NaolibWidget.jsx`, ajouter après la fonction `filterDisruptions` :

```js
const CRIT_ORDER = { critique: 0, majeure: 1, mineure: 2 }

export function applyFilters(disruptions, { transport = 'all', status = 'all', duration = 'all', favorites = null } = {}, now = new Date()) {
  let result = transport === 'all'
    ? disruptions
    : disruptions.filter(d => d.transport === transport)

  if (status === 'en_cours') {
    result = result.filter(d => {
      if (!d.startDate) return true
      const start = new Date(d.startDate)
      const end = d.endDate ? new Date(d.endDate) : null
      return start <= now && (!end || end > now)
    })
  } else if (status === 'a_venir') {
    result = result.filter(d => d.startDate && new Date(d.startDate) > now)
  }

  if (duration === 'courte') {
    result = result.filter(d => {
      if (!d.startDate || !d.endDate) return false
      return new Date(d.endDate) - new Date(d.startDate) < 2 * 3600 * 1000
    })
  } else if (duration === 'longue') {
    result = result.filter(d => {
      if (!d.startDate || !d.endDate) return false
      return new Date(d.endDate) - new Date(d.startDate) >= 2 * 3600 * 1000
    })
  } else if (duration === 'journee') {
    result = result.filter(d => {
      if (!d.startDate || !d.endDate) return true
      return new Date(d.endDate) - new Date(d.startDate) >= 8 * 3600 * 1000
    })
  }

  if (favorites && favorites.size > 0) {
    result = result.filter(d => d.lines.some(l => favorites.has(l)))
  }

  return [...result].sort((a, b) =>
    (CRIT_ORDER[a.criticality] ?? 2) - (CRIT_ORDER[b.criticality] ?? 2)
  )
}
```

- [ ] **Étape 4 : Lancer les tests — vérifier qu'ils passent**

```bash
npm test
```

Attendu : PASS sur tous les tests `applyFilters`

- [ ] **Étape 5 : Commit**

```bash
git add src/NaolibWidget.jsx src/NaolibWidget.test.js
git commit -m "feat: add applyFilters (transport, status, duration, favorites, criticality sort)"
```

---

## Task 3 : CriticalityBadge component + couleurs GlobalStatus

**Files:**
- Modify: `src/NaolibWidget.jsx`

- [ ] **Étape 1 : Ajouter `CRITICALITY_CONFIG` et `CriticalityBadge`**

Dans `src/NaolibWidget.jsx`, ajouter après `TYPE_CONFIG` (ligne ~276) :

```js
const CRITICALITY_CONFIG = {
  critique: { label: 'CRITIQUE', bg: '#ff8c12', text: '#ffffff' },
  majeure:  { label: 'MAJEURE',  bg: '#e8c500', text: '#002300' },
  mineure:  { label: 'MINEURE',  bg: '#78d700', text: '#002300' },
}

function CriticalityBadge({ criticality }) {
  const cfg = CRITICALITY_CONFIG[criticality] ?? CRITICALITY_CONFIG.mineure
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}
```

- [ ] **Étape 2 : Mettre à jour `STATUS_CONFIG` avec les couleurs charte Naolib**

Remplacer le `STATUS_CONFIG` existant (ligne ~154) :

```js
const STATUS_CONFIG = {
  normal: {
    label: 'Trafic normal',
    bg: '#f0ffe6',
    text: '#002300',
    dot: '#78d700',
  },
  perturbed: {
    label: 'Réseau perturbé',
    bg: '#fffbe6',
    text: '#5a4a00',
    dot: '#e8c500',
  },
  heavily_perturbed: {
    label: 'Réseau fortement perturbé',
    bg: '#fff4e6',
    text: '#7a3a00',
    dot: '#ff8c12',
  },
}
```

- [ ] **Étape 3 : Vérifier visuellement et lancer les tests**

```bash
npm test
```

Attendu : tous les tests existants passent (STATUS_CONFIG n'est pas testé directement).

- [ ] **Étape 4 : Commit**

```bash
git add src/NaolibWidget.jsx
git commit -m "feat: add CriticalityBadge component and update GlobalStatus colors to Naolib brand"
```

---

## Task 4 : DisruptionCard avec accordéon et étoile favori

**Files:**
- Modify: `src/NaolibWidget.jsx`

- [ ] **Étape 1 : Remplacer `DisruptionCard`**

Remplacer la fonction `DisruptionCard` existante (ligne ~314) :

```js
function DisruptionCard({ disruption, isExpanded, onToggle, isFavorite, onFavoriteToggle }) {
  const { type, transport, lines, title, description, startDate, endDate, isFinished, criticality } = disruption
  return (
    <div
      className={`rounded-lg border p-4 transition-colors cursor-pointer ${
        isFinished ? 'border-gray-100 bg-gray-50 opacity-75' : 'border-gray-100 hover:border-gray-200'
      }`}
      onClick={onToggle}
    >
      {/* Ligne compacte toujours visible */}
      <div className="flex items-center gap-2 flex-wrap">
        <CriticalityBadge criticality={criticality} />
        {lines.map(line => (
          <LineBadge key={line} line={line} transport={transport} />
        ))}
        {isFinished ? <TypeBadge type="termine" /> : <TypeBadge type={type} />}
        <span className="flex-1 font-semibold text-gray-900 text-sm min-w-0 truncate">{title}</span>
        <button
          onClick={e => { e.stopPropagation(); onFavoriteToggle() }}
          className="ml-auto shrink-0 text-base leading-none hover:scale-110 transition-transform"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <svg
          aria-hidden="true"
          focusable="false"
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Contenu déplié */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {description && (
            <p className="text-xs text-gray-500 mb-2">{description}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg aria-hidden="true" focusable="false" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Du {formatDate(startDate)}</span>
            {endDate && <span>au {formatDate(endDate)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Étape 2 : Lancer les tests**

```bash
npm test
```

Attendu : PASS (les tests ne testent pas `DisruptionCard` directement)

- [ ] **Étape 3 : Commit**

```bash
git add src/NaolibWidget.jsx
git commit -m "feat: accordion expand/collapse and favorite star on DisruptionCard"
```

---

## Task 5 : FilterBar — rangée 2 avec dropdowns et bouton Mes lignes

**Files:**
- Modify: `src/NaolibWidget.jsx`

- [ ] **Étape 1 : Remplacer `FilterBar`**

Remplacer la fonction `FilterBar` existante (ligne ~219) :

```js
const DROPDOWN_CLASS = `
  px-3 py-1 rounded-full text-sm font-medium border border-gray-200
  bg-white text-gray-600 hover:bg-gray-50 cursor-pointer
  focus:outline-none focus:ring-2 focus:ring-offset-1
`.trim()

function FilterBar({
  active, onChange,
  filterStatus, onStatusChange,
  filterDuration, onDurationChange,
  filterFavorites, onFavoritesChange,
}) {
  return (
    <div className="mb-4 space-y-2">
      {/* Rangée 1 : transport */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrer par type de transport">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              active === f.value
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={active === f.value ? { backgroundColor: '#002300' } : {}}
            aria-pressed={active === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rangée 2 : statut, durée, favoris */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={filterStatus}
          onChange={e => onStatusChange(e.target.value)}
          className={DROPDOWN_CLASS}
          aria-label="Filtrer par statut"
        >
          <option value="all">Statut</option>
          <option value="en_cours">En cours</option>
          <option value="a_venir">À venir</option>
        </select>

        <select
          value={filterDuration}
          onChange={e => onDurationChange(e.target.value)}
          className={DROPDOWN_CLASS}
          aria-label="Filtrer par durée"
        >
          <option value="all">Durée</option>
          <option value="courte">Courte (&lt; 2h)</option>
          <option value="longue">Longue (&gt; 2h)</option>
          <option value="journee">Toute la journée</option>
        </select>

        <button
          onClick={() => onFavoritesChange(!filterFavorites)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filterFavorites
              ? 'text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={filterFavorites ? { backgroundColor: '#002300' } : {}}
          aria-pressed={filterFavorites}
        >
          ⭐ Mes lignes
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 : Lancer les tests**

```bash
npm test
```

Attendu : PASS

- [ ] **Étape 3 : Commit**

```bash
git add src/NaolibWidget.jsx
git commit -m "feat: add status/duration dropdowns and favorites button to FilterBar"
```

---

## Task 6 : NaolibWidget — câblage état accordéon, filtres avancés, favoris

**Files:**
- Modify: `src/NaolibWidget.jsx`

- [ ] **Étape 1 : Remplacer le composant principal `NaolibWidget`**

Remplacer la fonction `NaolibWidget` exportée (ligne ~403) :

```js
const FAVORITES_KEY = 'naolib-favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(set) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]))
  } catch {
    // localStorage indisponible (SSR, private browsing strict) — silently ignore
  }
}

export default function NaolibWidget() {
  const [filter, setFilter] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDuration, setFilterDuration] = useState('all')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [favorites, setFavorites] = useState(() => loadFavorites())
  const [expandedId, setExpandedId] = useState(null)

  const { data, loading, error, lastUpdate, refresh } = useFetch()

  const filtered = applyFilters(data, {
    transport: filter,
    status: filterStatus,
    duration: filterDuration,
    favorites: filterFavorites ? favorites : null,
  })

  const status = getNetworkStatus(data)

  function toggleFavorite(line) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      saveFavorites(next)
      return next
    })
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto font-sans">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />
      <GlobalStatus status={status} />
      <FilterBar
        active={filter}
        onChange={setFilter}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterDuration={filterDuration}
        onDurationChange={setFilterDuration}
        filterFavorites={filterFavorites}
        onFavoritesChange={setFilterFavorites}
      />
      {loading ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(d => (
            <DisruptionCard
              key={d.id}
              disruption={d}
              isExpanded={expandedId === d.id}
              onToggle={() => toggleExpand(d.id)}
              isFavorite={d.lines.length > 0 && favorites.has(d.lines[0])}
              onFavoriteToggle={() => d.lines.length > 0 && toggleFavorite(d.lines[0])}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Étape 2 : Lancer tous les tests**

```bash
npm test
```

Attendu : PASS sur l'ensemble de la suite

- [ ] **Étape 3 : Vérifier le build**

```bash
npm run build
```

Attendu : build sans erreur ni warning Vite

- [ ] **Étape 4 : Commit final**

```bash
git add src/NaolibWidget.jsx
git commit -m "feat: wire accordion, advanced filters, and favorites state in NaolibWidget"
```

---

## Self-Review

**Couverture spec :**
- ✅ Badge criticité (CRITIQUE/MAJEURE/MINEURE) — Task 3
- ✅ Tri par criticité décroissante — Task 2 (`applyFilters` + sort)
- ✅ Bandeau global mis à jour couleurs Naolib — Task 3
- ✅ Accordéon vue réduite/dépliée, un seul ouvert à la fois — Task 4
- ✅ Dropdown Statut (En cours / À venir / Tous) — Task 5
- ✅ Dropdown Durée (Courte / Longue / Toute la journée) — Task 5
- ✅ Favoris : étoile par carte, localStorage, filtre "Mes lignes" — Task 4 + Task 6
- ✅ Filtres combinés en AND — Task 6 via `applyFilters`
- ✅ Géolocalisation : hors périmètre (non implémentée)

**Placeholders :** aucun.

**Cohérence des types :**
- `criticality: 'critique' | 'majeure' | 'mineure'` défini Task 1, utilisé Task 2, 3, 4 — cohérent
- `applyFilters(disruptions, { transport, status, duration, favorites }, now)` — signature identique Tasks 2 et 6
- `DisruptionCard` props `isExpanded`, `onToggle`, `isFavorite`, `onFavoriteToggle` — définis Task 4, passés Task 6 — cohérent
- `FilterBar` props `filterStatus`, `onStatusChange`, `filterDuration`, `onDurationChange`, `filterFavorites`, `onFavoritesChange` — définis Task 5, passés Task 6 — cohérent
