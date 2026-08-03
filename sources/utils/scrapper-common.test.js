import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findEventType } from './event-type-finder.js';
import {
  absoluteUrl,
  dedupeEvents,
  finalizeEvents,
  normalizeEvent,
  parseLocation,
} from './scrapper-common.js';

vi.mock('./event-type-finder.js', () => ({
  findEventType: vi.fn((input) => Symbol(input)),
}));

describe('absoluteUrl', () => {
  const base = 'https://example.com';

  it('retourne null si le lien est null/undefined/vide', () => {
    expect(absoluteUrl(null, base)).toBeNull();
    expect(absoluteUrl(undefined, base)).toBeNull();
    expect(absoluteUrl('', base)).toBeNull();
  });

  it('retourne le lien tel quel s’il est absolu (http/https)', () => {
    expect(absoluteUrl('https://foo.com/bar', base)).toBe(
      'https://foo.com/bar',
    );
    expect(absoluteUrl('http://foo.com', base)).toBe('http://foo.com');
  });

  it('préfixe avec baseUrl si le lien est relatif', () => {
    expect(absoluteUrl('/events', base)).toBe('https://example.com/events');
    expect(absoluteUrl('event/42', base)).toBe('https://example.comevent/42');
  });
});

describe('parseLocation', () => {
  it('retourne des nulls si le texte est absent', () => {
    expect(parseLocation(null)).toEqual({
      city: null,
      departementNumber: null,
    });
    expect(parseLocation(undefined)).toEqual({
      city: null,
      departementNumber: null,
    });
    expect(parseLocation('')).toEqual({ city: null, departementNumber: null });
  });

  it('parse "City (35)"', () => {
    expect(parseLocation('Rennes (35)')).toEqual({
      city: 'Rennes',
      departementNumber: 35,
    });
  });

  it('parse "City, Region (13)"', () => {
    expect(parseLocation('Marseille, Provence-Alpes-Côte d’Azur (13)')).toEqual(
      {
        city: 'Marseille',
        departementNumber: 13,
      },
    );
  });

  it('gère les numéros à 3 chiffres (DOM-TOM)', () => {
    expect(parseLocation('Fort-de-France (972)')).toEqual({
      city: 'Fort-de-France',
      departementNumber: 972,
    });
  });

  it('retourne la ville sans département si pas de parenthèses', () => {
    expect(parseLocation('  Paris  ')).toEqual({
      city: 'Paris',
      departementNumber: null,
    });
  });

  it('trim les espaces superflus', () => {
    expect(parseLocation('  Lyon   (69)  ')).toEqual({
      city: 'Lyon',
      departementNumber: 69,
    });
  });
});

describe('normalizeEvent', () => {
  it('applique les valeurs par défaut', () => {
    const result = normalizeEvent({});
    expect(result).toEqual({
      place: 'unknown',
      city: null,
      departementNumber: null,
      eventType: expect.any(Symbol),
      numberOfRaceVariants: 'unknown',
      registrationLink: '',
      registrationStatus: 'unknown',
    });
  });

  it('passe eventType par findEventType', () => {
    const result = normalizeEvent({ eventType: 'trail' });
    expect(findEventType).toHaveBeenCalledWith('trail');
    expect(result.eventType.description).toBe('trail');
  });

  it('les valeurs fournies écrasent les défauts', () => {
    const result = normalizeEvent({
      place: 'Stade',
      city: 'Rennes',
      eventType: 'marathon',
    });
    expect(result.place).toBe('Stade');
    expect(result.city).toBe('Rennes');
    expect(result.eventType.description).toBe('marathon');
  });

  it('findEventType écrase toujours eventType, même si raw en contient un', () => {
    const result = normalizeEvent({ eventType: 'trail' });
    expect(typeof result.eventType).toBe('symbol');
    expect(result.eventType).not.toBe('trail');
  });

  it('eventType undefined passe quand même par findEventType', () => {
    const result = normalizeEvent({});
    expect(findEventType).toHaveBeenCalledWith(undefined);
    expect(typeof result.eventType).toBe('symbol');
  });
});

describe('dedupeEvents', () => {
  it('déduplique sur eventLink', () => {
    const events = [{ eventLink: 'a' }, { eventLink: 'b' }, { eventLink: 'a' }];
    expect(dedupeEvents(events)).toEqual([
      { eventLink: 'a' },
      { eventLink: 'b' },
    ]);
  });

  it('supprime les événements sans eventLink (null/undefined)', () => {
    expect(dedupeEvents([{ eventLink: null }, {}, { eventLink: 'a' }])).toEqual(
      [{ eventLink: 'a' }],
    );
  });

  it('retourne un tableau vide pour une entrée vide', () => {
    expect(dedupeEvents([])).toEqual([]);
  });
});

describe('finalizeEvents', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const day = 24 * 60 * 60 * 1000;
  const d = (n) => new Date(n).getTime();

  it('trie les événements par date croissante et retourne le tableau', () => {
    const events = [
      { beginning: d('2026-09-10') },
      { beginning: d('2026-03-05') },
      { beginning: d('2026-06-15') },
    ];
    const result = finalizeEvents('TEST', 'https://example.com', events);
    expect(result.map((e) => e.beginning)).toEqual([
      d('2026-03-05'),
      d('2026-06-15'),
      d('2026-09-10'),
    ]);
    expect(result).toBe(events);
  });

  it('log le nombre d’événements et l’URL', () => {
    finalizeEvents('TEST', 'https://example.com', [
      { beginning: d('2026-03-05') },
    ]);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain(
      '[TEST] Trouvé 1 événements sur https://example.com',
    );
  });

  it('log la plage de dates quand il y a des événements', () => {
    finalizeEvents('TEST', 'https://example.com', [
      { beginning: d('2026-03-05') },
      { beginning: d('2026-09-10') },
    ]);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toMatch(/\[TEST\]\s+Du .* au .*/);
  });

  it('ne log pas de plage quand la liste est vide', () => {
    finalizeEvents('TEST', 'https://example.com', []);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Trouvé 0 événements');
    expect(output).not.toMatch(/Du .* au /);
  });

  it('log le nombre d’événements et l’URL', () => {
    finalizeEvents('TEST', 'https://example.com', [
      { beginning: d('2026-03-05') },
    ]);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain(
      '[TEST] Trouvé 1 événements sur https://example.com',
    );
  });

  it('log la plage de dates quand il y a des événements', () => {
    finalizeEvents('TEST', 'https://example.com', [
      { beginning: d('2026-03-05') },
      { beginning: d('2026-09-10') },
    ]);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toMatch(/\[TEST\]\s+Du .* au .*/);
  });

  it('ne log pas de plage quand la liste est vide', () => {
    finalizeEvents('TEST', 'https://example.com', []);
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Trouvé 0 événements');
    expect(output).not.toMatch(/Du .* au /);
  });
});
