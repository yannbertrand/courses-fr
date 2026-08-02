import { getBrowserPage } from '../browser/browser.js';
import { listFutureEvents as listECFutureEvents } from './espace-competition/scrapper.js';
import { listFutureEvents as listKLFutureEvents } from './klikego/scrapper.js';
import { listFutureEvents as listMRFutureEvents } from './milesrepublic/scrapper.js';
import { listFutureEvents as listTPFutureEvents } from './timepulse/scrapper.js';

export async function listAllFutureEvents(nbMois) {
  const { browser, page } = await getBrowserPage();

  const events = [
    ...(await listECFutureEvents(nbMois, { page })),
    ...(await listKLFutureEvents(nbMois, { page })),
    ...(await listMRFutureEvents(nbMois)),
    ...(await listTPFutureEvents(nbMois, { page })),
  ].sort((a, b) => a.beginning - b.beginning);

  await browser.close();
  return events;
}
