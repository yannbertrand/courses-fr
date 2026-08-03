import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../utils/mock-fetch.js';
import { listFutureEvents } from './scrapper.js';

describe('#milesrepublic.listFutureEvents()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return list of all future events', async () => {
    const json = await readFile(
      resolve(__dirname, 'mocks/search.json'),
      'utf-8',
    );
    mockFetch([
      {
        match: 'https://search.milesrepublic.com/multi-search',
        format: 'application/json',
        response: json,
      },
    ]);

    const list = await listFutureEvents(1);
    expect(list).toMatchInlineSnapshot(`
      [
        {
          "beginning": 1768604400000,
          "city": "Paris",
          "departementNumber": 75,
          "ending": 1796425200000,
          "eventLink": "https://fr.milesrepublic.com/event/2-miles-sri-chinmoy-7590",
          "eventType": "running",
          "name": "2 miles Sri Chinmoy",
          "numberOfRaceVariants": 1,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "open",
        },
        {
          "beginning": 1773010800000,
          "city": "Velaux",
          "departementNumber": 13,
          "ending": 1809892800000,
          "eventLink": "https://fr.milesrepublic.com/event/rando-ste-propice-route-gravel-vtt-et-marche-15713",
          "eventType": "walk",
          "name": "Rando Ste Propice",
          "numberOfRaceVariants": 19,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1777845600000,
          "city": "Saint-Jean-de-Monts",
          "departementNumber": 85,
          "ending": 1789369200000,
          "eventLink": "https://fr.milesrepublic.com/event/lindahls-pro-triathlon-series-12136",
          "eventType": "triathlon",
          "name": "Lindahls Pro+ Triathlon Séries",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1779962700000,
          "city": "Rosheim",
          "departementNumber": 67,
          "ending": 1790590500000,
          "eventLink": "https://fr.milesrepublic.com/event/les-foulees-des-4-portes-3037",
          "eventType": "running",
          "name": "Les foulées des 4 portes",
          "numberOfRaceVariants": 7,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1780128000000,
          "city": "Château-Chinon(Ville)",
          "departementNumber": 58,
          "ending": 1794560400000,
          "eventLink": "https://fr.milesrepublic.com/event/morvan-oxygene-trail-2108",
          "eventType": "running",
          "name": "Morvan oxygène trail",
          "numberOfRaceVariants": 6,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "open",
        },
        {
          "beginning": 1780351200000,
          "city": "Peyrolles-en-Provence",
          "departementNumber": 13,
          "ending": 1789855200000,
          "eventLink": "https://fr.milesrepublic.com/event/mud-girl-provence-10158",
          "eventType": "fun",
          "name": "Mud girl Provence",
          "numberOfRaceVariants": 1,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1780911000000,
          "city": "Cabourg",
          "departementNumber": 14,
          "ending": 1790460000000,
          "eventLink": "https://fr.milesrepublic.com/event/-lindahls-pro-triathlon-series-12724",
          "eventType": "triathlon",
          "name": " Lindahls Pro+ Triathlon Séries",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1781942400000,
          "city": "Peyrabout",
          "departementNumber": 23,
          "ending": 1790488800000,
          "eventLink": "https://fr.milesrepublic.com/event/l-enfer-vert-15328",
          "eventType": "other",
          "name": "L'enfer vert",
          "numberOfRaceVariants": 1,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "open",
        },
        {
          "beginning": 1782115200000,
          "city": "Albertville",
          "departementNumber": 73,
          "ending": 1786348800000,
          "eventLink": "https://fr.milesrepublic.com/event/la-monte-et-seche-10757",
          "eventType": "cycling",
          "name": "La Monte et sèche",
          "numberOfRaceVariants": 4,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1782626400000,
          "city": "La Mézière",
          "departementNumber": 35,
          "ending": 1791183600000,
          "eventLink": "https://fr.milesrepublic.com/event/gravel-des-brasseurs-11986",
          "eventType": "cycling",
          "name": "LA Mez Bain",
          "numberOfRaceVariants": 2,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
        {
          "beginning": 1783202400000,
          "city": "Ambérieu-en-Bugey",
          "departementNumber": 1,
          "ending": 1792274400000,
          "eventLink": "https://fr.milesrepublic.com/event/bugey-night-racing-serie-9024",
          "eventType": "trail",
          "name": "Bugey night racing serie",
          "numberOfRaceVariants": 3,
          "place": "unknown",
          "registrationLink": "",
          "registrationStatus": "unknown",
        },
      ]
    `);
  });
});
