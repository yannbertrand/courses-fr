import { getBrowserPage } from '../browser/browser.js';
import { listFutureEvents as listECFutureEvents } from './espace-competition/scrapper.js';
import { listFutureEvents as listKLFutureEvents } from './klikego/scrapper.js';
import { listFutureEvents as listMRFutureEvents } from './milesrepublic/scrapper.js';
import { listFutureEvents as listTPFutureEvents } from './timepulse/scrapper.js';
import { sortEvents } from './utils/scrapper-common.js';

export async function listAllFutureEvents(nbMois) {
  const { browser, page } = await getBrowserPage();

  const events = sortEvents([
    ...(await listECFutureEvents(nbMois, { page })),
    ...(await listKLFutureEvents(nbMois, { page })),
    ...(await listMRFutureEvents(nbMois)),
    ...(await listTPFutureEvents(nbMois, { page })),
  ]);

  await browser.close();
  return events;
}
