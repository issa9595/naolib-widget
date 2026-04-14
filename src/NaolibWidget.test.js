import { describe, it, expect } from 'vitest'
import { normalizeRecord, getNetworkStatus, filterDisruptions, applyFilters } from './NaolibWidget.jsx'

// Fixtures réutilisables (format ODS réel)
const makeTram = (id = 't1') => ({ id, type: 'tram', transport: 'tram', lines: ['Tram 1'], title: 'Test tram', description: '', startDate: '', endDate: '' })
const makeBus = (id = 'b1') => ({ id, type: 'travaux', transport: 'bus', lines: ['C1'], title: 'Test bus', description: '', startDate: '', endDate: '' })
const makeNavibus = (id = 'n1') => ({ id, type: 'incident', transport: 'navibus', lines: ['N'], title: 'Test navibus', description: '', startDate: '', endDate: '' })

describe('normalizeRecord', () => {
  it('normalise un record API ODS réel (format troncons)', () => {
    const record = {
      code: '23900',
      intitule: 'Travaux à l\'arrêt Picabia',
      resume: 'En raison de la construction, l\'arrêt est décalé.',
      date_debut: '2025-10-25',
      heure_debut: '10:52',
      date_fin: '2026-10-31',
      heure_fin: '18:00',
      troncons: '[TE1/1/-/-]',
      perturbation_terminee: 0,
    }
    const result = normalizeRecord(record)
    expect(result.id).toBe('23900')
    expect(result.title).toBe('Travaux à l\'arrêt Picabia')
    expect(result.type).toBe('travaux')
    expect(result.transport).toBe('tram')
    expect(result.lines).toEqual(['Tram 1'])
    expect(result.startDate).toBe('2025-10-25T10:52')
    expect(result.endDate).toBe('2026-10-31T18:00')
    expect(result.description).toBe('En raison de la construction, l\'arrêt est décalé.')
  })

  it('détecte troncons multiples avec transport tram prioritaire', () => {
    const record = {
      code: '999',
      intitule: 'Perturbations multiples',
      troncons: '[TE1/1/-/-];[C6/2/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '08:00',
    }
    const result = normalizeRecord(record)
    expect(result.lines).toEqual(['Tram 1', 'C6'])
    expect(result.transport).toBe('tram')
  })

  it('détecte navibus depuis troncons', () => {
    const record = {
      code: '888',
      intitule: 'Service réduit navibus',
      troncons: '[N1/1/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '06:00',
    }
    const result = normalizeRecord(record)
    expect(result.transport).toBe('navibus')
    expect(result.lines).toEqual(['N1'])
  })

  it('ignore le code NC dans troncons', () => {
    const record = {
      code: '777',
      intitule: 'Perturbation non communiquée',
      troncons: '[NC/-/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '09:00',
    }
    const result = normalizeRecord(record)
    expect(result.lines).toEqual([])
    expect(result.transport).toBe('bus')
  })

  it('normalise un record au format fields imbriqués (test/legacy)', () => {
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
  })

  it('fallback transport = bus si lines est vide', () => {
    const record = { fields: { lines: '', type: 'incident', title: 'Test' } }
    expect(normalizeRecord(record).transport).toBe('bus')
    expect(normalizeRecord(record).lines).toEqual([])
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
    expect(getNetworkStatus([makeTram()])).toBe('perturbed')
  })

  it('retourne perturbed si 2 perturbations', () => {
    expect(getNetworkStatus([makeTram(), makeBus()])).toBe('perturbed')
  })

  it('retourne heavily_perturbed si 3+ perturbations', () => {
    expect(getNetworkStatus([makeTram(), makeBus(), makeNavibus()])).toBe('heavily_perturbed')
  })
})

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

describe('filterDisruptions', () => {
  const DATA = [makeTram('t1'), makeTram('t2'), makeBus('b1'), makeBus('b2'), makeNavibus('n1')]

  it('retourne tout si filter = all', () => {
    expect(filterDisruptions(DATA, 'all')).toHaveLength(5)
  })

  it('filtre par tram', () => {
    const result = filterDisruptions(DATA, 'tram')
    expect(result.every(d => d.transport === 'tram')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filtre par bus', () => {
    const result = filterDisruptions(DATA, 'bus')
    expect(result.every(d => d.transport === 'bus')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('filtre par navibus', () => {
    const result = filterDisruptions(DATA, 'navibus')
    expect(result.every(d => d.transport === 'navibus')).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('retourne tableau vide pour filtre inconnu', () => {
    expect(filterDisruptions(DATA, 'ferry')).toHaveLength(0)
  })
})

// ─── applyFilters ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-14T12:00:00')
const PAST = '2026-04-14T08:00:00'
const FUTURE_2H = '2026-04-14T14:30:00'
const FUTURE_1H = '2026-04-14T13:00:00'
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
      const long1 = makeDisruption({ id: '1', startDate: PAST, endDate: FUTURE_1H })
      const long2 = makeDisruption({ id: '2', startDate: PAST, endDate: FUTURE_2H })
      const short = makeDisruption({ id: '3', startDate: '2026-04-14T12:00:00', endDate: '2026-04-14T12:30:00' })
      const result = applyFilters([long1, long2, short], { duration: 'courte' }, NOW)
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
