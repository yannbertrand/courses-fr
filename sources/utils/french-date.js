const MONTHS = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

export const MONTH_ABBR_TO_FULL = {
  janv: 'janvier',
  fevr: 'fevrier',
  fev: 'fevrier',
  mars: 'mars',
  avr: 'avril',
  mai: 'mai',
  juin: 'juin',
  juil: 'juillet',
  aout: 'aout',
  sept: 'septembre',
  oct: 'octobre',
  nov: 'novembre',
  dec: 'decembre',
};

export function frenchDateToIsoDate(dateString) {
  const regex = /(\d{1,2})(?: - (\d{1,2}))?\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i;
  const match = dateString.match(regex);
  if (!match) throw new Error(`Format invalide: ${dateString}`);

  const [, beginningDay, endingDay, moisStr, year] = match;
  const moisIndex = MONTHS[normalizeMonth(moisStr)];
  if (moisIndex === undefined) throw new Error(`Mois invalide: ${moisStr}`);

  const mm = String(moisIndex).padStart(2, '0');
  const beginning = new Date(
    `${year}-${mm}-${beginningDay.padStart(2, '0')}`,
  ).getTime();

  return {
    beginning,
    ending: endingDay
      ? new Date(`${year}-${mm}-${endingDay.padStart(2, '0')}`).getTime()
      : beginning,
  };
}

/**
 * Expand a month abbreviation ("déc.", "fevr", "août") to a full month name.
 * Throws on unknown abbreviations.
 */
export function expandMonthAbbr(abbr) {
  const key = normalizeMonth(abbr).replace(/\.$/, '');
  const full = MONTH_ABBR_TO_FULL[key];
  if (!full) throw new Error(`Mois inconnu: ${abbr}`);
  return full;
}

/**
 * Normalize a French month name/abbr for lookup:
 * lowercase + strip diacritics (é -> e, û -> u, à -> a).
 */
function normalizeMonth(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
