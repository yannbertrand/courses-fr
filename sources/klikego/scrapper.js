import { frenchDateToIsoDate } from '../utils/french-date.js';

/**
 * Récupère la liste des événements Klikego sur les nbMois prochains mois.
 *
 * @param {number} nbMois - Nombre de mois à récupérer (à partir d'aujourd'hui)
 * @param {{ page: import('puppeteer').Page }} context - Page Puppeteer à utiliser
 * @returns {Promise<Array<Object>>} Événements normalisés
 */
export async function listFutureEvents(nbMois, { page }) {
  console.log(`[KL] Récupération des événements`);

  const url = 'https://www.klikego.com/v8/evenements/search.jsp?search=&geo=';

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });

  if (!res.ok)
    throw new Error(`Erreur HTTP ${res.status} sur la recherche Klikego`);

  const buffer = await res.arrayBuffer();
  const html = new TextDecoder('utf-8').decode(buffer);
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Extraction brute de toutes les cartes d'événements
  const rawEvents = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div.relative.w-full'));

    return cards
      .map((card) => {
        const link = card.querySelector('a[href*="/inscription/"]');
        if (!link) return null;

        const name =
          card
            .querySelector('.text-content-body-emphasis')
            ?.textContent.trim() ?? null;

        const noteTexts = Array.from(
          card.querySelectorAll('.text-content-note-regular'),
        ).map((el) => el.textContent.trim());

        const dateText = noteTexts.find((t) => /\d{4}/.test(t)) ?? null;
        const locationText =
          noteTexts.find((t) => /\(\d{2,3}\)/.test(t)) ?? null;

        // Nombre de variantes de course = nombre de badges de distance
        const numberOfRaceVariants = card.querySelectorAll(
          '.badge.badge-neutral.badge-light',
        ).length;

        return {
          name,
          dateText,
          locationText,
          numberOfRaceVariants,
          link: link.getAttribute('href'),
        };
      })
      .filter(Boolean);
  });

  // Limite de filtrage : aujourd'hui + nbMois
  const now = new Date();
  const limitDate = new Date(now.getFullYear(), now.getMonth() + nbMois + 1, 1);

  const events = [];

  for (const raw of rawEvents) {
    if (!raw.dateText) continue;

    // Normalisation du texte de date Klikego ("6 déc. 2026", "11–13 déc. 2026")
    // vers un format compatible avec frenchDateToIsoDate
    let beginning, ending;
    try {
      ({ beginning, ending } = parseKlikegoDate(raw.dateText));
    } catch {
      continue; // format de date non géré, on ignore l'événement
    }

    // Filtrage par nbMois
    if (new Date(beginning) >= limitDate) continue;

    // Parsing de "Janze, Ille et Vilaine (35)"
    let city = null;
    let departementNumber = null;
    if (raw.locationText) {
      const locMatch = raw.locationText.match(
        /^(.+?),\s*(.+?)\s*\((\d{2,3})\)$/,
      );
      if (locMatch) {
        city = locMatch[1].trim();
        departementNumber = parseInt(locMatch[3], 10);
      }
    }

    const eventLink = raw.link.startsWith('http')
      ? raw.link
      : `https://www.klikego.com${raw.link}`;

    events.push({
      beginning,
      city,
      departementNumber,
      ending,
      eventLink,
      eventType: 'unknown',
      name: raw.name,
      numberOfRaceVariants:
        raw.numberOfRaceVariants > 0 ? raw.numberOfRaceVariants : 'unknown',
      place: null,
      registrationLink: '',
      registrationStatus: 'unknown',
    });
  }

  console.log(
    `[KL] Trouvé ${events.length} évenements sur https://www.klikego.com/recherche?search=&geo=`,
  );

  return events;
}

const MONTH_ABBR_TO_FULL = {
  janv: 'janvier',
  févr: 'février',
  fev: 'février',
  mars: 'mars',
  avr: 'avril',
  mai: 'mai',
  juin: 'juin',
  juil: 'juillet',
  août: 'août',
  aout: 'août',
  sept: 'septembre',
  oct: 'octobre',
  nov: 'novembre',
  déc: 'décembre',
  dec: 'décembre',
};

/**
 * Convertit une date Klikego ("6 déc. 2026", "11–13 déc. 2026",
 * "1 févr. – 20 déc. 2026", "1 sept. 2026 – 31 août 2027")
 * en { beginning, ending } ISO, en réutilisant frenchDateToIsoDate.
 */
function parseKlikegoDate(rawText) {
  const cleaned = rawText
    .replace(/\u00a0/g, ' ') // espaces insécables
    .replace(/\./g, '') // "déc." -> "déc"
    .replace(/[–—]/g, '-') // tirets typographiques -> tiret simple
    .replace(/\s+/g, ' ')
    .trim();

  const expandMonth = (abbr) => {
    const full = MONTH_ABBR_TO_FULL[abbr.toLowerCase()];
    if (!full) throw new Error(`Mois inconnu: ${abbr}`);
    return full;
  };

  // Cas 1 : "6 déc 2026" ou "11-13 déc 2026" -> directement compatible après expansion
  let match = cleaned.match(
    /^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([a-zéûà]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, d2, abbr, year] = match;
    const month = expandMonth(abbr);
    return frenchDateToIsoDate(
      d2 ? `${d1} - ${d2} ${month} ${year}` : `${d1} ${month} ${year}`,
    );
  }

  // Cas 2 : "1 févr - 20 déc 2026" (deux mois, une année)
  match = cleaned.match(
    /^(\d{1,2})\s+([a-zéûà]+)\s*-\s*(\d{1,2})\s+([a-zéûà]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, m1, d2, m2, y] = match;
    return {
      beginning: frenchDateToIsoDate(`${d1} ${expandMonth(m1)} ${y}`).beginning,
      ending: frenchDateToIsoDate(`${d2} ${expandMonth(m2)} ${y}`).beginning,
    };
  }

  // Cas 3 : "1 sept 2026 - 31 août 2027" (deux dates complètes)
  match = cleaned.match(
    /^(\d{1,2})\s+([a-zéûà]+)\s+(\d{4})\s*-\s*(\d{1,2})\s+([a-zéûà]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, m1, y1, d2, m2, y2] = match;
    return {
      beginning: frenchDateToIsoDate(`${d1} ${expandMonth(m1)} ${y1}`)
        .beginning,
      ending: frenchDateToIsoDate(`${d2} ${expandMonth(m2)} ${y2}`).beginning,
    };
  }

  throw new Error(`Format de date Klikego non reconnu: ${rawText}`);
}
