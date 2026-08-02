import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listAllFutureEvents } from '../sources/list-all-future-events.js';

export async function buildJson() {
  const events = await listAllFutureEvents(12);
  console.log(`Trouvé ${events.length} évenements dans les 12 prochains mois`);
  writeFile(resolve('./dist/events.json'), JSON.stringify(events, null, 2));
}
