import { useState, useEffect, useRef } from 'react'

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
    description: "La ligne Tram 2 est déviée en raison d'un événement culturel place Royale.",
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
  if (t.includes('dév')) return 'deviation'
  return 'autre'
}

export function normalizeRecord(record) {
  const fields = record.fields || record
  const linesRaw = fields.lines || fields.lignes || ''
  const lines = typeof linesRaw === 'string'
    ? linesRaw.split(',').map(l => l.trim()).filter(Boolean)
    : Array.isArray(linesRaw) ? linesRaw : []

  return {
    id: record.recordid || record.id || `${fields.title || fields.titre || 'unknown'}-${fields.startdate || fields.datedebut || ''}`,
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

function MockBanner() {
  return (
    <div role="alert" className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-xs text-yellow-700">
      <svg aria-hidden="true" focusable="false" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      Données simulées — API indisponible
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
  const [isMock, setIsMock] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const abortRef = useRef(null)

  async function runFetch() {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(API_URL, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (controller.signal.aborted) return
      setData((json.results || []).map(normalizeRecord))
      setIsMock(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      if (controller.signal.aborted) return
      setData(MOCK_DATA)
      setIsMock(true)
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

  return { data, loading, isMock, lastUpdate, refresh: runFetch }
}

// ─── Composant principal ──────────────────────────────────────────────────────

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
