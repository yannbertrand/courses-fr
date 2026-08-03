import {
  expandMonthAbbr,
  frenchDateToIsoDate,
  getDateRange,
} from '../utils/date.js';
import {
  absoluteUrl,
  dedupeEvents,
  finalizeEvents,
  normalizeEvent,
  parseLocation,
} from '../utils/scrapper-common.js';

const BASE_URL = 'https://www.klikego.com';
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

/**
 * Génère la liste des query params "YYYY-MM" de now à now + nbMois.
 *
 * @param {number} nbMois
 * @returns {string[]} ex. ['2026-08', '2026-09', ...]
 */
function buildMonthParams(nbMois) {
  const now = new Date();
  const params = [];
  for (let i = 0; i <= nbMois; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    params.push(`${d.getFullYear()}-${month}`);
  }
  return params;
}

/**
 * Récupère la liste des événements Klikego sur les nbMois prochains mois.
 *
 * @param {number} nbMois - Nombre de mois à récupérer (à partir d'aujourd'hui)
 * @param {{ page: import('puppeteer').Page }} context - Page Puppeteer à utiliser
 * @returns {Promise<Array<Object>>} Événements normalisés
 */
export async function listFutureEvents(nbMois, { page }) {
  const monthParams = buildMonthParams(nbMois);
  console.log(
    `[KL] Récupération des événements pour ${monthParams.join(', ')}`,
  );
  const { limitDate } = getDateRange(nbMois);
  const events = [];

  for (const dateParam of monthParams) {
    const url = `${BASE_URL}/v8/evenements/search.jsp?search=&geo=&date=${dateParam}`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (!res.ok) {
      console.warn(
        `[KL] Erreur HTTP ${res.status} pour date=${dateParam}, on continue`,
      );
      continue;
    }
    const html = new TextDecoder('utf-8').decode(await res.arrayBuffer());
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const rawEvents = await page.evaluate(extractCards); // hoisted for testability

    for (const raw of rawEvents) {
      if (!raw.dateText) continue;
      const eventLink = absoluteUrl(raw.link, BASE_URL);

      let beginning, ending;
      try {
        ({ beginning, ending } = parseKlikegoDate(raw.dateText));
      } catch {
        continue;
      }

      if (new Date(beginning) >= limitDate) continue;

      events.push(
        normalizeEvent({
          beginning,
          ending,
          eventLink,
          name: raw.name,
          ...parseLocation(raw.locationText),
          numberOfRaceVariants:
            raw.numberOfRaceVariants > 0 ? raw.numberOfRaceVariants : 'unknown',
        }),
      );
    }
  }

  const dedupedEvents = dedupeEvents(events);

  return finalizeEvents('KL', `${BASE_URL}/recherche`, dedupedEvents);
}

function extractCards() {
  const cards = Array.from(document.querySelectorAll('div.relative.w-full'));

  return cards
    .map((card) => {
      const link = card.querySelector('a[href*="/inscription/"]');
      if (!link) return null;

      const name =
        card.querySelector('.text-content-body-emphasis')?.textContent.trim() ??
        null;

      const noteTexts = Array.from(
        card.querySelectorAll('.text-content-note-regular'),
      ).map((el) => el.textContent.trim());

      const dateText = noteTexts.find((t) => /\d{4}/.test(t)) ?? null;
      const locationText = noteTexts.find((t) => /\(\d{2,3}\)/.test(t)) ?? null;

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
}

/**
 * Convertit une date Klikego ("6 déc. 2026", "11–13 déc. 2026",
 * "1 févr. – 20 déc. 2026", "1 sept. 2026 – 31 août 2027")
 * en { beginning, ending } ISO, en réutilisant frenchDateToIsoDate.
 */
function parseKlikegoDate(rawText) {
  const cleaned = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\./g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // Cas 1 : "6 déc 2026" ou "11-13 déc 2026"
  let match = cleaned.match(
    /^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, d2, abbr, year] = match;
    const month = expandMonthAbbr(abbr);
    return frenchDateToIsoDate(
      d2 ? `${d1} - ${d2} ${month} ${year}` : `${d1} ${month} ${year}`,
    );
  }

  // Cas 2 : "1 févr - 20 déc 2026"
  match = cleaned.match(
    /^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s*-\s*(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, m1, d2, m2, y] = match;
    return {
      beginning: frenchDateToIsoDate(`${d1} ${expandMonthAbbr(m1)} ${y}`)
        .beginning,
      ending: frenchDateToIsoDate(`${d2} ${expandMonthAbbr(m2)} ${y}`)
        .beginning,
    };
  }

  // Cas 3 : "1 sept 2026 - 31 août 2027"
  match = cleaned.match(
    /^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s*-\s*(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i,
  );
  if (match) {
    const [, d1, m1, y1, d2, m2, y2] = match;
    return {
      beginning: frenchDateToIsoDate(`${d1} ${expandMonthAbbr(m1)} ${y1}`)
        .beginning,
      ending: frenchDateToIsoDate(`${d2} ${expandMonthAbbr(m2)} ${y2}`)
        .beginning,
    };
  }

  throw new Error(`Format de date Klikego non reconnu: ${rawText}`);
}
