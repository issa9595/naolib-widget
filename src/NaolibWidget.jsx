import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Calendar, CheckCircle, AlertTriangle, ChevronDown, Star } from 'lucide-react'

// ─── Fonctions utilitaires pures ──────────────────────────────────────────────

// Parses real API "troncons" field e.g. "[TE1/1/-/-];[C6/2/-/-]" → ['TE1', 'C6']
function parseTroncons(raw) {
  if (!raw) return []
  const matches = raw.match(/\[([^\]]+)\]/g) || []
  return matches
    .map(m => m.slice(1, -1).split('/')[0].trim())
    .filter(c => c && c !== 'NC')
}

// Maps internal line codes to display names: TE1 → Tram 1, C1 → C1, etc.
function lineCodeToDisplayName(code) {
  if (code.startsWith('TE')) return `Tram ${code.slice(2)}`
  return code
}

// Detects transport from real API line codes
function detectTransportFromCodes(codes) {
  if (codes.some(c => c.startsWith('TE'))) return 'tram'
  if (codes.some(c => /^N\d*$/.test(c))) return 'navibus'
  return 'bus'
}

// Fallback transport detection from display names (old/test format)
function detectTransport(lines) {
  const joined = lines.join(' ').toLowerCase()
  if (joined.includes('tram')) return 'tram'
  if (joined.includes('navibus') || joined.includes('bateau')) return 'navibus'
  return 'bus'
}

function getCriticality(type) {
  if (type === 'incident') return 'critique'
  if (type === 'travaux') return 'majeure'
  return 'mineure'
}

function normalizeType(raw) {
  const t = (raw || '').toLowerCase()
  if (t.includes('trav')) return 'travaux'
  if (t.includes('inci') || t.includes('panne') || t.includes('pertub')) return 'incident'
  if (t.includes('dév')) return 'deviation'
  return 'autre'
}

export function normalizeRecord(record) {
  // Real API (ODS v2.1): flat record with `troncons`, `intitule`, `resume`, `date_debut`…
  // Legacy/test format: may have nested `record.fields` with `lines`, `title`, `startdate`…
  const isRealApi = !record.fields && record.troncons !== undefined
  const fields = record.fields || record

  let lines, lineCodes
  if (isRealApi) {
    lineCodes = parseTroncons(fields.troncons)
    lines = lineCodes.map(lineCodeToDisplayName)
  } else {
    lineCodes = []
    const linesRaw = fields.lines || fields.lignes || ''
    lines = typeof linesRaw === 'string'
      ? linesRaw.split(',').map(l => l.trim()).filter(Boolean)
      : Array.isArray(linesRaw) ? linesRaw : []
  }

  const transport = lineCodes.length > 0
    ? detectTransportFromCodes(lineCodes)
    : detectTransport(lines)

  let startDate, endDate
  if (isRealApi) {
    startDate = fields.date_debut
      ? `${fields.date_debut}T${fields.heure_debut || '00:00'}`
      : ''
    endDate = fields.date_fin
      ? `${fields.date_fin}T${fields.heure_fin || '00:00'}`
      : ''
  } else {
    startDate = fields.startdate || fields.datedebut || ''
    endDate = fields.enddate || fields.datefin || ''
  }

  const title = fields.intitule || fields.title || fields.titre || lines.join(', ') || 'Perturbation'

  const isFinished = endDate ? new Date(endDate) < new Date() : false
  const type = normalizeType(fields.type || fields.typeevenement || fields.intitule || '')

  return {
    id: record.code || record.recordid || record.id || `${title}-${startDate}`,
    type,
    transport,
    lines,
    title,
    description: fields.resume || fields.description || '',
    startDate,
    endDate,
    isFinished,
    criticality: getCriticality(type),
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
        <span style={{ color: '#002300' }} className="text-xl font-bold">État du réseau</span>
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
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}

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

function GlobalStatus({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.normal
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-10 text-red-700 bg-red-50 rounded-xl gap-3">
      <AlertTriangle className="w-10 h-10" />
      <p className="font-semibold text-base">Impossible de charger les données</p>
      <p className="text-sm text-red-500">L'API Naolib est momentanément indisponible.</p>
      <button
        onClick={onRetry}
        className="mt-1 px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: '#002300' }}
      >
        Réessayer
      </button>
    </div>
  )
}

const FILTERS = [
  { value: 'all', label: 'Tout' },
  { value: 'tram', label: 'Tram' },
  { value: 'bus', label: 'Bus' },
  { value: 'navibus', label: 'Navibus' },
]

const DROPDOWN_CLASS = [
  'px-3 py-1 rounded-full text-sm font-medium border border-gray-200',
  'bg-white text-gray-600 hover:bg-gray-50 cursor-pointer',
  'focus:outline-none',
].join(' ')

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

const FILTER_LABELS = { tram: 'Tram', bus: 'Bus', navibus: 'Navibus' }

function EmptyState({ filter }) {
  const isFiltered = filter && filter !== 'all'
  const title = isFiltered
    ? `Aucune perturbation sur ${FILTER_LABELS[filter] || filter}`
    : 'Trafic normal sur l\'ensemble du réseau'
  const subtitle = isFiltered
    ? 'Ce type de transport circule normalement'
    : 'Aucune perturbation en cours'
  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ backgroundColor: '#f0ffe6', color: '#002300' }}>
      <CheckCircle className="w-10 h-10 mb-3" />
      <p className="font-semibold text-base">{title}</p>
      <p className="text-sm mt-1" style={{ color: '#4a7a00' }}>{subtitle}</p>
    </div>
  )
}

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

const TYPE_CONFIG = {
  travaux: { label: 'Travaux', bg: '#e8c500', text: '#002300' },
  incident: { label: 'Incident', bg: '#ff8c12', text: '#ffffff' },
  deviation: { label: 'Déviation', bg: '#8c8cff', text: '#002300' },
  autre: { label: 'Autre', bg: '#757575', text: '#ffffff' },
  termine: { label: 'Terminé', bg: '#78d700', text: '#002300' },
}

const TRANSPORT_CONFIG = {
  tram: { bg: '#002300', text: '#ffffff' },
  bus: { bg: '#78d700', text: '#002300' },
  navibus: { bg: '#73beff', text: '#002300' },
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.autre
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
  const cfg = TRANSPORT_CONFIG[transport] ?? TRANSPORT_CONFIG.bus
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {line}
    </span>
  )
}

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
          className="ml-auto shrink-0 hover:scale-110 transition-transform"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star
            className="w-4 h-4"
            style={{ color: isFavorite ? '#e8c500' : '#d1d5db', fill: isFavorite ? '#e8c500' : 'none' }}
          />
        </button>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Contenu déplié */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {description && (
            <p className="text-xs text-gray-500 mb-2">{description}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar aria-hidden="true" className="w-3 h-3" />
            <span>Du {formatDate(startDate)}</span>
            {endDate && <span>au {formatDate(endDate)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hook de fetch ────────────────────────────────────────────────────────────

const API_URL =
  'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_info-trafic-tan-temps-reel/records?limit=20'

function useFetch() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const abortRef = useRef(null)

  async function runFetch() {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(false)
    try {
      const res = await fetch(API_URL, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (controller.signal.aborted) return
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const records = (json.results || [])
        .map(normalizeRecord)
        .filter(r => !r.startDate || new Date(r.startDate) >= thirtyDaysAgo)
      const seen = new Set()
      const deduped = records.filter(r => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      })
      setData(deduped)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (controller.signal.aborted) return
      setError(true)
      setData([])
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setLastUpdate(new Date())
      }
    }
  }

  useEffect(() => {
    runFetch()
    const interval = setInterval(runFetch, 60_000)
    return () => {
      clearInterval(interval)
      if (abortRef.current) abortRef.current.abort()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, lastUpdate, refresh: runFetch }
}

// ─── Composant principal ──────────────────────────────────────────────────────

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
    // localStorage indisponible — silently ignore
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
