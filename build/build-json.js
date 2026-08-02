import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listAllFutureEvents } from '../sources/list-all-future-events.js';

export async function buildJson() {
  const nbMois = 12;
  const events = await listAllFutureEvents(nbMois);

  console.log(``);
  console.log(
    `Trouvé ${events.length} évenements dans les ${nbMois} prochains mois`,
  );
  console.log(``);

  writeFile(resolve('./dist/events.json'), JSON.stringify(events, null, 2));
}
