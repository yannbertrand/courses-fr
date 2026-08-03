import { findEventType } from '../utils/event-type-finder.js';

const API_URL = 'https://search.milesrepublic.com/multi-search';
const TOKEN =
  '6ec06c9d0b2ad245d4e7d098af96c5ba660e5f3b9a458200116cd124f3ddae6e';

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
  const category = hit.editionLiveLevel1CategoryKey?.[0];
  const eventLink = `https://fr.milesrepublic.com/event/${hit.eventSlug}`;

  return {
    beginning: hit.editionLiveStartDateTimestamp * 1000,
    ending: hit.editionLiveEndDateTimestamp * 1000,
    city: hit.eventCity,
    departementNumber: getDepartementNumber(hit),
    eventType: category ? findEventType(category) : 'unknown',
    name: hit.eventName,
    numberOfRaceVariants: hit.eventLiveDistanceKm?.length ?? 'unknown',
    place: 'unknown',
    eventLink,
    registrationLink: '',
    registrationStatus:
      hit.editionCalendarStatus === 'CONFIRMED' ? 'open' : 'unknown',
  };
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
  console.log(`[MR] Récupération des événements`);
  const events = [];

  const now = new Date();
  const limitDate = new Date(now.getFullYear(), now.getMonth() + nbMois + 1, 1);

  let page = 1;
  let totalPages = Infinity;
  const seen = new Set();

  let body = getBody(now, limitDate); // 👈 corrigé : 2 arguments

  while (page <= totalPages) {
    console.log(
      `[MR] Chargement de la page ${page}/${totalPages === Infinity ? '?' : totalPages}`,
    );
    body.queries[0].page = page;

    let data;
    try {
      data = await fetchPage(body);
    } catch (err) {
      // Si objectID n'est pas sortable, on retente sans tie-breaker
      if (page === 1 && /invalid_sort|sort/i.test(err.message)) {
        console.warn(
          '[MR] Tri avec tie-breaker refusé, fallback au tri simple',
        );
        body = getBody(now, limitDate, false);
        body.queries[0].page = page;
        data = await fetchPage(body);
      } else {
        throw err;
      }
    }

    const result = data.results[0];
    console.log(
      `[MR] Page ${page}/${totalPages} — ${result.hits.length} résultats`,
    );

    for (const hit of result.hits) {
      if (seen.has(hit.objectID)) continue;
      seen.add(hit.objectID);
      events.push(mapHit(hit));
    }

    totalPages = result.totalPages ?? 1;
    page++;
  }

  console.log(
    `[KL] Trouvé ${events.length} événements`,
    `[KL] Du ${new Date(events.at(0)?.beginning).toLocaleString('fr-FR')} au ${new Date(events.at(-1)?.beginning).toLocaleString('fr-FR')}`,
  );
  return events;
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
