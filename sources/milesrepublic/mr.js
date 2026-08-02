const API_URL = 'https://search.milesrepublic.com/multi-search';
const TOKEN =
  '6ec06c9d0b2ad245d4e7d098af96c5ba660e5f3b9a458200116cd124f3ddae6e';

const now = Math.floor(Date.now() / 1000);
async function testPage(page) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queries: [
        {
          indexUid: 'fra_events',
          q: '',
          filter: [
            '_geoBoundingBox([52.526157916110805, 9.7], [36.38341995380996, -5.5])',
            `editionLiveEndDateTimestamp>${now} AND eventStatus="LIVE"`,
          ],
          attributesToRetrieve: ['objectID', 'eventName'],
          hitsPerPage: 42,
          page,
          sort: ['eventIsFeatured:desc', 'editionLiveStartDateTimestamp:asc'],
        },
      ],
    }),
  });
  const data = await res.json();
  const r = data.results[0];
  console.log(
    `page demandée: ${page} | page retournée: ${r.page} | totalPages: ${r.totalPages} | premier hit: ${r.hits[0]?.objectID} ${r.hits[0]?.eventName}`,
  );
}

await testPage(1);
await testPage(2);
await testPage(3);
