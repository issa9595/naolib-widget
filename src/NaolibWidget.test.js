import { describe, it, expect } from 'vitest'
import { normalizeRecord, getNetworkStatus, filterDisruptions } from './NaolibWidget.jsx'

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
