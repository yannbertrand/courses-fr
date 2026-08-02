import { getBrowserPage } from './browser/browser.js';
import { listFutureEvents as listECFutureEvents } from './sources/espace-competition/scrapper.js';
import { listFutureEvents as listTPFutureEvents } from './sources/timepulse/scrapper.js';

const { browser, page } = await getBrowserPage();

try {
  const events = [
    ...(await listECFutureEvents(3, { page })),
    ...(await listTPFutureEvents(3, { page })),
  ].sort((a, b) => a.beginning.localeCompare(b.beginning));
  console.log('\n=== Résultat final ===');
  console.log(JSON.stringify(events, null, 2));
  console.log(`\nTotal unique: ${events.length} événements`);
} catch (err) {
  console.error('Erreur:', err.message);
}

await browser.close();
