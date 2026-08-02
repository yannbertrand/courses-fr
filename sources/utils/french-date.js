export function frenchDateToIsoDate(dateString) {
  const mois = {
    janvier: 1,
    février: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    août: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    décembre: 12,
  };

  const regex = /(\d{1,2})(?: - (\d{1,2}))?\s+([A-ZÀ-ÿ]+)\s+(\d{4})/i;
  const match = dateString.match(regex);
  if (!match) throw new Error(`Format invalide: ${dateString}`);
  const [, beginningDay, endingDay, moisStr, year] = match;
  const moisIndex = mois[moisStr.toLowerCase()];
  if (moisIndex === undefined) throw new Error(`Mois invalide: ${moisStr}`);
  const beginning = `${year}-${`${moisIndex}`.padStart(2, '0')}-${beginningDay.padStart(2, '0')}`;
  return {
    beginning,
    ending: endingDay
      ? `${year}-${`${moisIndex}`.padStart(2, '0')}-${endingDay.padStart(2, '0')}`
      : beginning,
  };
}
