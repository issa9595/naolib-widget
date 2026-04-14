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
