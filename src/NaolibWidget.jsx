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
    id: record.recordid || record.id || 'unknown',
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
