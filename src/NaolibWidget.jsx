import { useState, useEffect, useRef } from 'react'

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

  return {
    id: record.code || record.recordid || record.id || `${title}-${startDate}`,
    type: normalizeType(fields.type || fields.typeevenement || fields.intitule || ''),
    transport,
    lines,
    title,
    description: fields.resume || fields.description || '',
    startDate,
    endDate,
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
            aria-hidden="true"
            focusable="false"
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
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.normal
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} ${cfg.text} mb-4 text-sm font-medium`}>
      <span aria-hidden="true" className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-10 text-red-700 bg-red-50 rounded-xl gap-3">
      <svg aria-hidden="true" focusable="false" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="font-semibold text-base">Impossible de charger les données</p>
      <p className="text-sm text-red-500">L'API Naolib est momentanément indisponible.</p>
      <button
        onClick={onRetry}
        className="mt-1 px-4 py-1.5 rounded-full text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: '#003189' }}
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
    <div className="flex flex-col items-center justify-center py-10 text-green-700 bg-green-50 rounded-xl">
      <svg aria-hidden="true" focusable="false" className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="font-semibold text-base">{title}</p>
      <p className="text-sm text-green-600 mt-1">{subtitle}</p>
    </div>
  )
}

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
        <svg aria-hidden="true" focusable="false" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Du {formatDate(startDate)}</span>
        {endDate && <span>au {formatDate(endDate)}</span>}
      </div>
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
      setData((json.results || []).map(normalizeRecord))
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

export default function NaolibWidget() {
  const [filter, setFilter] = useState('all')
  const { data, loading, error, lastUpdate, refresh } = useFetch()
  const filtered = filterDisruptions(data, filter)
  const status = getNetworkStatus(filtered)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 max-w-2xl mx-auto font-sans">
      <Header lastUpdate={lastUpdate} onRefresh={refresh} loading={loading} />
      <GlobalStatus status={status} />
      <FilterBar active={filter} onChange={setFilter} />
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
            <DisruptionCard key={d.id} disruption={d} />
          ))}
        </div>
      )}
    </div>
  )
}
