import { getBrowserPage } from '../../browser/browser.js';
import { getDateRange, isInRange } from '../utils/date.js';
import {
  dedupeEvents,
  finalizeEvents,
  normalizeEvent,
} from '../utils/scrapper-common.js';

const API_URL = 'https://search.milesrepublic.com/multi-search';
const BASE_URL = 'https://fr.milesrepublic.com';

const SITE_URL =
  'https://fr.milesrepublic.com/search?geoSearch=52.526157916110805%2C9.7%2C36.38341995380996%2C-5.5&geoLocation=France';
const SEARCH_URL = 'https://fr.milesrepublic.com/_search/multi-search';

const MAX_PAGES = 50;
let cachedToken = null;

function getBody(after, before, withTieBreaker = true) {
  return {
    queries: [
      {
        indexUid: 'fra_events',
        q: '',
        filter: [
          '_geoBoundingBox([52.526157916110805, 9.7], [36.38341995380996, -5.5])',
          `editionLiveEndDateTimestamp>${Math.floor(after / 1000)} AND editionLiveStartDateTimestamp<${Math.floor(before / 1000)} AND eventStatus="LIVE"`,
        ],
        attributesToRetrieve: [
          'eventName',
          'eventCity',
          'eventLiveDistanceKm',
          'eventCountrySubdivisionDisplayCodeLevel2',
          'editionLiveLevel1CategoryKey',
          'eventSlug',
          'editionCalendarStatus',
          'eventLivePriceStartingFrom',
          'editionLiveStartDateTimestamp',
          'editionLiveEndDateTimestamp',
          'eventCoverImage',
          'editionLiveLevel2CategoryKey',
          'eventIsFeatured',
          'objectID',
          'eventCountry',
          '_geo',
        ],
        hitsPerPage: 500,
        page: 1,
        sort: withTieBreaker
          ? ['editionLiveStartDateTimestamp:asc', 'objectID:asc']
          : ['editionLiveStartDateTimestamp:asc'],
      },
    ],
  };
}

function mapHit(hit) {
  return normalizeEvent({
    beginning: hit.editionLiveStartDateTimestamp * 1000,
    ending: hit.editionLiveEndDateTimestamp * 1000,
    city: hit.eventCity,
    departementNumber: getDepartementNumber(hit),
    eventType: hit.editionLiveLevel1CategoryKey?.[0] ?? null,
    name: hit.eventName,
    numberOfRaceVariants: hit.eventLiveDistanceKm?.length ?? 'unknown',
    eventLink: `${BASE_URL}/event/${hit.eventSlug}`,
    registrationStatus:
      hit.editionCalendarStatus === 'CONFIRMED' ? 'open' : 'unknown',
  });
}

export async function fetchFreshToken(timeoutMs = 30000) {
  const { browser, page } = await getBrowserPage();

  try {
    const tokenPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Token non trouvé (timeout)')),
        timeoutMs,
      );

      page.on('request', (request) => {
        console.log(request.url());
        if (!request.url().includes(SEARCH_URL)) return;

        const auth = request.headers()['authorization'];
        if (auth?.startsWith('Bearer ')) {
          clearTimeout(timer);
          resolve(auth.slice('Bearer '.length));
        }
      });
    });
    // Ne pas await le goto : on laisse le challenge se faire en parallèle
    page
      .goto(SITE_URL, { waitUntil: 'networkidle2', timeout: timeoutMs })
      .catch(() => {});

    return await tokenPromise;
  } finally {
    await browser.close();
  }
}

function isTokenValid(token, marginSeconds = 60) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    );
    return payload.exp > Date.now() / 1000 + marginSeconds;
  } catch {
    return false;
  }
}

async function getToken(forceRefresh = false) {
  if (!forceRefresh || (cachedToken != null && isTokenValid(cachedToken))) {
    return cachedToken;
  }
  console.log("[MR] Récupération d'un nouveau token via Puppeteer");
  cachedToken = await fetchFreshToken();
  return cachedToken;
}

async function postSearch(body, token) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Origin: 'https://fr.milesrepublic.com',
      Referer: 'https://fr.milesrepublic.com/',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}: ${await res.text()}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchPage(body, baseToken) {
  if (baseToken != null) {
    cachedToken = baseToken;
  }
  const token = baseToken ?? (await getToken());

  try {
    return await postSearch(body, token);
  } catch (err) {
    if (err.status !== 401 && err.status !== 403) throw err;

    console.warn('[MR] Token rejeté, renouvellement et nouvelle tentative');
    const freshToken = await getToken(true);
    return postSearch(body, freshToken);
  }
}

export async function listFutureEvents(nbMois, baseToken) {
  console.log('[MR] Récupération des événements');
  const { now, limitDate } = getDateRange(nbMois);
  const events = [];
  let page = 1,
    totalPages = Infinity;
  let body = getBody(now.getTime(), limitDate.getTime());

  while (page <= totalPages && page <= MAX_PAGES) {
    console.log(
      `[MR] Chargement de la page ${page}/${totalPages === Infinity ? '?' : totalPages}`,
    );
    body.queries[0].page = page;
    let data;
    try {
      data = await fetchPage(body, baseToken);
    } catch (err) {
      if (page === 1 && /invalid_sort|sort/i.test(err.message)) {
        console.warn(
          '[MR] Tri avec tie-breaker refusé, fallback au tri simple',
        );
        body = getBody(now.getTime(), limitDate.getTime(), false);
        body.queries[0].page = page;
        data = await fetchPage(body, baseToken);
      } else throw err;
    }
    const result = data.results[0];
    for (const hit of result.hits) {
      const event = mapHit(hit);
      if (!isInRange(event.beginning, event.ending, { now, limitDate }))
        continue;
      events.push(event);
    }
    totalPages = result.totalPages ?? 1;
    page++;
  }

  if (page > MAX_PAGES) {
    console.warn(
      `[MR] Limite de ${MAX_PAGES} pages atteinte, pagination arrêtée prématurément.`,
    );
  }

  const dedupedEvents = dedupeEvents(events);

  return finalizeEvents('MR', BASE_URL, dedupedEvents);
}

function getDepartementNumber(hit) {
  // Cas particuliers
  if (hit.eventCountry?.toLowerCase() !== 'france') return 99;
  if (hit.eventCity?.toLowerCase() === 'paris') return 75;

  const code = hit.eventCountrySubdivisionDisplayCodeLevel2;
  // certains codes ressemblent à "FR-75" ou juste "75"
  const match = String(code ?? '').match(/(\d{2,3})/);

  if (match?.length > 0) {
    return parseInt(match[1], 10);
  }
  return code;
}
