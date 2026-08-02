import { getBrowserPage } from './browser/browser.js';
import { listFutureEvents as listECFutureEvents } from './sources/espace-competition/scrapper.js';
import { listFutureEvents as listKLFutureEvents } from './sources/klikego/scrapper.js';
import { listFutureEvents as listTPFutureEvents } from './sources/timepulse/scrapper.js';

const { browser, page } = await getBrowserPage();

try {
  const events = [
    ...(await listECFutureEvents(1, { page })),
    ...(await listKLFutureEvents(1, { page })),
    ...(await listTPFutureEvents(1, { page })),
  ].sort((a, b) => a.beginning - b.beginning);
  console.log('\n=== Résultat final ===');
  console.log(JSON.stringify(events, null, 2));
  console.log(`\nTotal unique: ${events.length} événements`);
} catch (err) {
  console.error('Erreur:', err.message);
}

await browser.close();
