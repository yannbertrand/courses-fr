import { getBrowserPage } from './browser/browser.js';
import { listFutureEvents as listECFutureEvents } from './sources/espace-competition/scrapper.js';
import { listFutureEvents as listKLFutureEvents } from './sources/klikego/scrapper.js';
import { listFutureEvents as listMRFutureEvents } from './sources/milesrepublic/scrapper.js';
import { listFutureEvents as listTPFutureEvents } from './sources/timepulse/scrapper.js';

const { browser, page } = await getBrowserPage();

try {
  const nbMois = 1;
  const events = [
    ...(await listECFutureEvents(nbMois, { page })),
    ...(await listKLFutureEvents(nbMois, { page })),
    ...(await listMRFutureEvents(nbMois)),
    ...(await listTPFutureEvents(nbMois, { page })),
  ].sort((a, b) => a.beginning - b.beginning);
  console.log('\n=== Résultat final ===');
  console.log(
    JSON.stringify(
      events.map((e) => e.name),
      null,
      2,
    ),
  );
  console.log(`\nTotal unique: ${events.length} événements`);
} catch (err) {
  console.error('Erreur:', err.message);
}

await browser.close();
