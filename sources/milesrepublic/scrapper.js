import { getDateRange } from '../utils/date.js';
import {
  dedupeEvents,
  finalizeEvents,
  normalizeEvent,
} from '../utils/scrapper-common.js';

const API_URL = 'https://search.milesrepublic.com/multi-search';
const TOKEN =
  '6ec06c9d0b2ad245d4e7d098af96c5ba660e5f3b9a458200116cd124f3ddae6e';
const BASE_URL = 'https://fr.milesrepublic.com';

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

async function fetchPage(body) {
  const payload = body;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Origin: 'https://fr.milesrepublic.com',
      Referer: 'https://fr.milesrepublic.com/',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function listFutureEvents(nbMois) {
  console.log('[MR] Récupération des événements');
  const { now, limitDate } = getDateRange(nbMois);
  const events = [];
  let page = 1,
    totalPages = Infinity;
  let body = getBody(now.getTime(), limitDate.getTime());

  while (page <= totalPages) {
    console.log(
      `[MR] Chargement de la page ${page}/${totalPages === Infinity ? '?' : totalPages}`,
    );
    body.queries[0].page = page;
    let data;
    try {
      data = await fetchPage(body);
    } catch (err) {
      if (page === 1 && /invalid_sort|sort/i.test(err.message)) {
        console.warn(
          '[MR] Tri avec tie-breaker refusé, fallback au tri simple',
        );
        body = getBody(now.getTime(), limitDate.getTime(), false);
        body.queries[0].page = page;
        data = await fetchPage(body);
      } else throw err;
    }
    const result = data.results[0];
    for (const hit of result.hits) {
      events.push(mapHit(hit));
    }
    totalPages = result.totalPages ?? 1;
    page++;
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
