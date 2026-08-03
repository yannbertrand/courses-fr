// date.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  expandMonthAbbr,
  frenchDateToIsoDate,
  getDateRange,
  isInRange,
  MONTH_ABBR_TO_FULL,
} from './date.js';

describe('frenchDateToIsoDate', () => {
  it('convertit une date simple en timestamp', () => {
    const { beginning, ending } = frenchDateToIsoDate('15 mars 2026');
    expect(beginning).toBe(new Date('2026-03-15').getTime());
    expect(ending).toBe(beginning);
  });

  it('gère les plages de jours ("10 - 12 juin 2026")', () => {
    const { beginning, ending } = frenchDateToIsoDate('10 - 12 juin 2026');
    expect(beginning).toBe(new Date('2026-06-10').getTime());
    expect(ending).toBe(new Date('2026-06-12').getTime());
  });

  it('gère les jours à un seul chiffre', () => {
    const { beginning } = frenchDateToIsoDate('5 janvier 2026');
    expect(beginning).toBe(new Date('2026-01-05').getTime());
  });

  it('gère les accents et la casse ("Août", "DÉCEMBRE")', () => {
    expect(frenchDateToIsoDate('3 Août 2026').beginning).toBe(
      new Date('2026-08-03').getTime(),
    );
    expect(frenchDateToIsoDate('25 DÉCEMBRE 2026').beginning).toBe(
      new Date('2026-12-25').getTime(),
    );
  });

  it('lève une erreur sur un format invalide', () => {
    expect(() => frenchDateToIsoDate('15/03/2026')).toThrow(/Format invalide/);
    expect(() => frenchDateToIsoDate('')).toThrow(/Format invalide/);
  });

  it('lève une erreur sur un mois inconnu', () => {
    expect(() => frenchDateToIsoDate('15 smarch 2026')).toThrow(
      /Mois invalide: smarch/,
    );
  });
});

describe('expandMonthAbbr', () => {
  it.each([
    ['janv.', 'janvier'],
    ['fevr', 'fevrier'],
    ['fév.', 'fevrier'],
    ['avr.', 'avril'],
    ['juil.', 'juillet'],
    ['août', 'aout'],
    ['sept.', 'septembre'],
    ['déc.', 'decembre'],
  ])('étend "%s" en "%s"', (abbr, expected) => {
    expect(expandMonthAbbr(abbr)).toBe(expected);
  });

  it('accepte les noms complets présents dans la table', () => {
    expect(expandMonthAbbr('mars')).toBe('mars');
  });

  it('lève une erreur sur une abréviation inconnue', () => {
    expect(() => expandMonthAbbr('xyz')).toThrow(/Mois inconnu: xyz/);
  });
});

describe('getDateRange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne now = date courante', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-03T10:00:00'));
    const { now } = getDateRange(2);
    expect(now.getTime()).toBe(new Date('2026-08-03T10:00:00').getTime());
  });

  it('calcule limitDate comme le 1er jour du mois suivant nbMois', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-03T10:00:00'));
    const { limitDate } = getDateRange(2);
    // août + 2 mois = octobre, +1 => 1er novembre 2026
    expect(limitDate).toEqual(new Date(2026, 10, 1));
  });

  it("gère le passage à l'année suivante", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00'));
    const { limitDate } = getDateRange(2);
    // nov + 2 = janvier, +1 => 1er février 2027
    expect(limitDate).toEqual(new Date(2027, 1, 1));
  });
});

describe('isInRange', () => {
  // Fenêtre : aujourd'hui = 3 août 2026, limite = 1er octobre 2026
  const range = {
    now: new Date(2026, 7, 3, 12, 0, 0),
    limitDate: new Date(2026, 9, 1),
  };
  const ts = (y, m, d) => new Date(y, m, d).getTime();

  it('accepte un événement à venir dans la fenêtre', () => {
    expect(isInRange(ts(2026, 7, 10), ts(2026, 7, 10), range)).toBe(true);
  });

  it("accepte un événement qui se termine aujourd'hui", () => {
    expect(isInRange(ts(2026, 7, 1), ts(2026, 7, 3), range)).toBe(true);
  });

  it("accepte un événement en cours commencé avant aujourd'hui", () => {
    expect(isInRange(ts(2026, 6, 20), ts(2026, 7, 5), range)).toBe(true);
  });

  it('rejette un événement terminé hier', () => {
    expect(isInRange(ts(2026, 7, 1), ts(2026, 7, 2), range)).toBe(false);
  });

  it('rejette un événement commençant à la date limite (borne exclusive)', () => {
    expect(isInRange(ts(2026, 9, 1), ts(2026, 9, 1), range)).toBe(false);
  });

  it('accepte un événement commençant la veille de la date limite', () => {
    expect(isInRange(ts(2026, 8, 30), ts(2026, 8, 30), range)).toBe(true);
  });

  it('ignore l\'heure de "now" (comparaison sur le début du jour)', () => {
    // Un événement se terminant le jour même est inclus quelle que soit l'heure
    const rangeSoir = {
      now: new Date(2026, 7, 3, 23, 59),
      limitDate: range.limitDate,
    };
    expect(isInRange(ts(2026, 7, 3), ts(2026, 7, 3), rangeSoir)).toBe(true);
  });
});

describe('MONTH_ABBR_TO_FULL', () => {
  it('couvre les 12 mois', () => {
    const fullNames = new Set(Object.values(MONTH_ABBR_TO_FULL));
    expect(fullNames.size).toBe(12);
  });
});
