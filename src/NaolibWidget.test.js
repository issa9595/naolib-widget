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

  it('transport fallback = bus si lines est vide', () => {
    const record = { fields: { lines: '', type: 'incident', title: 'Test' } }
    expect(normalizeRecord(record).transport).toBe('bus')
    expect(normalizeRecord(record).lines).toEqual([])
  })

  it('normalise un record plat (sans champ fields)', () => {
    const record = {
      id: 'flat-1',
      lines: 'C1',
      type: 'incident',
      title: 'Incident bus',
      description: 'Description',
      startdate: '2026-04-14T10:00:00',
      enddate: '2026-04-14T12:00:00',
    }
    const result = normalizeRecord(record)
    expect(result.id).toBe('flat-1')
    expect(result.transport).toBe('bus')
    expect(result.title).toBe('Incident bus')
  })

  it('normalise un record réel ODS (format troncons)', () => {
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

  it('détecte troncons multiples avec transports différents', () => {
    const record = {
      code: '999',
      intitule: 'Perturbations multiples',
      troncons: '[TE1/1/-/-];[C6/2/-/-]',
      date_debut: '2026-04-14',
      heure_debut: '08:00',
    }
    const result = normalizeRecord(record)
    expect(result.lines).toEqual(['Tram 1', 'C6'])
    expect(result.transport).toBe('tram') // tram prend la priorité
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
    expect(result.transport).toBe('bus') // fallback
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

  it('retourne tableau vide pour filtre inconnu', () => {
    expect(filterDisruptions(MOCK_DATA, 'ferry')).toHaveLength(0)
  })
})
