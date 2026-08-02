import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBrowserPage } from '../../browser/browser.js';
import { listFutureEvents } from './scrapper.js';

describe('#timePulse.listFutureEvents()', () => {
  it('should return list of all future events', async () => {
    const html = readFileSync(resolve(__dirname, 'mocks/index.html'), 'utf-8');
    const { browser, page } = await getBrowserPage({
      'https://www.timepulse.fr/calendrier': {
        status: 200,
        contentType: 'text/html',
        body: html,
      },
    });

    const list = await listFutureEvents(1, { page });
    expect(list).toMatchInlineSnapshot(`
      [
        {
          "beginning": "2026-08-09",
          "city": "Saint-Michel-Chef-Chef",
          "departementNumber": 44,
          "ending": "2026-08-09",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3422/les-foulees-micheloises-2026-saint-michel-chef-chef",
          "eventType": "course_a_pied",
          "name": "Les Foulées Micheloises 2026",
          "numberOfRaceVariants": "unknown",
          "place": "Complexe sportif de la Viauderie",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3422/les-foulees-micheloises-2026-saint-michel-chef-chef#epreuve",
          "registrationStatus": "open",
        },
        {
          "beginning": "2026-08-09",
          "city": "Paris 15 Vaugirard",
          "departementNumber": 75,
          "ending": "2026-08-09",
          "eventLink": "https://www.timepulse.fr/calendrier/voir/3511/edf-aqua-challenge-paris-paris-15-vaugirard",
          "eventType": "natation",
          "name": "EDF AQUA CHALLENGE PARIS",
          "numberOfRaceVariants": "unknown",
          "place": "BRAS DE GRENELLE - PARIS 15 VAUGIRARD (75)",
          "registrationLink": "https://www.timepulse.fr/calendrier/voir/3511/edf-aqua-challenge-paris-paris-15-vaugirard",
          "registrationStatus": "unknown",
        },
        {
          "beginning": "2026-08-15",
          "city": "Saint-Brevin-les-Pins",
          "departementNumber": 44,
          "ending": "2026-08-15",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3407/les-foulees-des-dunes-saint-brevin-les-pins",
          "eventType": "course_a_pied",
          "name": "Les Foulées des Dunes",
          "numberOfRaceVariants": "unknown",
          "place": "Boulevard de l'Océan (A proximité de l'Office du Tourisme situé Place Rene Guy Cadou ) Saint Brevin L'Océan.",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3407/les-foulees-des-dunes-saint-brevin-les-pins#epreuve",
          "registrationStatus": "open",
        },
        {
          "beginning": "2026-08-15",
          "city": "Annecy",
          "departementNumber": 74,
          "ending": "2026-08-15",
          "eventLink": "https://www.timepulse.fr/calendrier/voir/3512/traversee-du-lac-a-annecy-74-annecy",
          "eventType": "natation",
          "name": "Traversée du lac à ANNECY (74)",
          "numberOfRaceVariants": "unknown",
          "place": "Annecy",
          "registrationLink": "https://www.timepulse.fr/calendrier/voir/3512/traversee-du-lac-a-annecy-74-annecy",
          "registrationStatus": "unknown",
        },
        {
          "beginning": "2026-08-22",
          "city": "La Pommeraye",
          "departementNumber": 49,
          "ending": "2026-08-23",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3318/trail-des-moulins-2026-la-pommeraye",
          "eventType": "course_a_pied",
          "name": "Trail des Moulins 2026",
          "numberOfRaceVariants": "unknown",
          "place": "Stade de la Pommeraye",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3318/trail-des-moulins-2026-la-pommeraye#epreuve",
          "registrationStatus": "open",
        },
        {
          "beginning": "2026-08-23",
          "city": "La Pommeraye",
          "departementNumber": 49,
          "ending": "2026-08-23",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3320/marche-nordique-trail-des-moulins-2026-la-pommeraye",
          "eventType": "marche_nordique",
          "name": "Marche Nordique Trail des Moulins 2026",
          "numberOfRaceVariants": "unknown",
          "place": "Stade de la Pommeraye",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3320/marche-nordique-trail-des-moulins-2026-la-pommeraye#epreuve",
          "registrationStatus": "open",
        },
        {
          "beginning": "2026-08-30",
          "city": "Couffé",
          "departementNumber": 44,
          "ending": "2026-08-30",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3335/trail-du-pont-noyer-couffe",
          "eventType": "course_a_pied",
          "name": "Trail du Pont Noyer",
          "numberOfRaceVariants": "unknown",
          "place": "Le Haut Vieux Couffé",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3335/trail-du-pont-noyer-couffe#epreuve",
          "registrationStatus": "open",
        },
        {
          "beginning": "2026-08-30",
          "city": "Toulon",
          "departementNumber": 83,
          "ending": "2026-08-31",
          "eventLink": "https://www.timepulse.fr/evenements/voir/3420/toulon-swim-race-toulon",
          "eventType": "natation",
          "name": "TOULON SWIM RACE",
          "numberOfRaceVariants": "unknown",
          "place": "Anse des Pins, Mourillon, Toulon",
          "registrationLink": "https://www.timepulse.fr/evenements/voir/3420/toulon-swim-race-toulon#epreuve",
          "registrationStatus": "open",
        },
      ]
    `);

    await browser.close();
  });
});
