import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBrowserPage } from '../../browser/browser.js';
import { listFutureEvents } from './scrapper.js';

describe('#espaceCompetition.listFutureEvents()', () => {
  it('should return list of all future events', async () => {
    const html = await readFile(
      resolve(__dirname, 'mocks/index.html'),
      'utf-8',
    );
    const { browser, page } = await getBrowserPage({
      'https://www.espace-competition.com/index.php?module=accueil&action=agenda':
        {
          status: 200,
          contentType: 'text/html',
          body: html,
        },
    });

    const list = await listFutureEvents(1, { page });
    expect(list).toMatchInlineSnapshot(`
      [
        {
          "beginning": 1791590400000,
          "city": "NOIRMOUTIER-EN-L'ÎLE",
          "departementNumber": 85,
          "ending": 1791590400000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3210",
          "eventType": "running",
          "name": "CROSS DÉPARTEMENTAL DES SAPEURS-POMPIERS DE LA VENDÉE",
          "numberOfRaceVariants": 1,
          "place": "unknown",
          "registrationLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3210",
          "registrationStatus": "open",
        },
        {
          "beginning": 1791590400000,
          "city": "SEGRE-EN-ANJOU BLEU (SEGRE)",
          "departementNumber": 49,
          "ending": 1791590400000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3195",
          "eventType": "trail",
          "name": "TRAIL URBAIN DE SEGRE",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "http://www.athletisme-esshautanjou.fr/",
          "registrationStatus": "open",
        },
        {
          "beginning": 1792281600000,
          "city": "LOIRE-AUTHION",
          "departementNumber": 49,
          "ending": 1792281600000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3200",
          "eventType": "running",
          "name": "LA’TITUDE ÉDITION 2026",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "http://www.loire-authion.fr/course-nature-latitude/",
          "registrationStatus": "open",
        },
        {
          "beginning": 1792281600000,
          "city": "LE LUDE",
          "departementNumber": 72,
          "ending": 1792281600000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3107",
          "eventType": "running",
          "name": "LES FOULEES LUDOISES 2026 - 15EME EDITION",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "http://lesfouleesludoises.e-monsite.com/",
          "registrationStatus": "open",
        },
        {
          "beginning": 1792281600000,
          "city": "MOZÉ SUR LOUET",
          "departementNumber": 49,
          "ending": 1792281600000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3125",
          "eventType": "running",
          "name": "LES TRACES DU LOUET",
          "numberOfRaceVariants": 9,
          "place": "unknown",
          "registrationLink": "https://lestracesdulouet.com/",
          "registrationStatus": "open",
        },
        {
          "beginning": 1792800000000,
          "city": "SAINT JEAN DE LINIÈRES – SAINT LEGER DE LINIERES",
          "departementNumber": 49,
          "ending": 1792800000000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3152",
          "eventType": "running",
          "name": "13EME LINIÈROISE",
          "numberOfRaceVariants": 7,
          "place": "unknown",
          "registrationLink": "https://la-linieroise.sportsregions.fr/",
          "registrationStatus": "closed",
        },
        {
          "beginning": 1792886400000,
          "city": "CRAON",
          "departementNumber": 53,
          "ending": 1792886400000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3219",
          "eventType": "trail",
          "name": "CRAON NATUR'HALLES TRAIL 2026",
          "numberOfRaceVariants": 9,
          "place": "unknown",
          "registrationLink": "https://www.facebook.com/CraonNaturhallesTrail",
          "registrationStatus": "open",
        },
        {
          "beginning": 1792886400000,
          "city": "LA ROCHE-SUR-YON",
          "departementNumber": 85,
          "ending": 1792886400000,
          "eventLink": "https://www.espace-competition.com/index.php?module=inscription&comp=3216",
          "eventType": "running",
          "name": "LES FOULÉES BOURGADINES",
          "numberOfRaceVariants": 5,
          "place": "unknown",
          "registrationLink": "https://larochesuryon.asptt.com/",
          "registrationStatus": "open",
        },
      ]
    `);

    await browser.close();
  });
});
