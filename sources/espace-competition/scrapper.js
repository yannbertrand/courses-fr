import { findEventType } from '../utils/event-type-finder.js';
import { frenchDateToIsoDate } from '../utils/french-date.js';

export async function listFutureEvents(nbMois = 12, { page }) {
  console.log(`[EC] Récupération des événements`);

  await page.goto(
    'https://www.espace-competition.com/index.php?module=accueil&action=agenda',
    {
      waitUntil: 'networkidle2',
    },
  );

  try {
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.innerText.trim());
      if (/ok|accepter/i.test(text)) {
        await btn.click();
        break;
      }
    }
  } catch (e) {}

  console.log(`[EC] Chargement du mois initial (1/${nbMois})...`);

  for (let i = 2; i <= nbMois; i++) {
    console.log(`[EC] Chargement du mois suivant (${i}/${nbMois})...`);

    await Promise.all([
      page
        .waitForResponse((res) => res.url().includes('agenda_charger'), {
          timeout: 10000,
        })
        .catch(() => {}),
      page.click('td.mois-sup[data-suiv="1"]'),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log('[EC] Extraction des événements...');

  const events = await page.evaluate(async () => {
    const result = [];
    const trs = Array.from(document.querySelectorAll('tbody > tr'));

    for (const tr of trs) {
      const link = tr.querySelector('h4 a[href*="module=inscription"]');
      if (!link) continue;

      const comp = new URL(link.href, location.origin).searchParams.get('comp');
      const name = link.innerText.trim();

      const dateDiv = tr.querySelector('.col-sm-3 div:nth-child(2)');
      const dateString = dateDiv ? dateDiv.innerText.trim() : null;

      const discEl = tr.querySelector('.col-sm-3 i.text-muted');
      let eventType = null;
      if (discEl) {
        const clone = discEl.cloneNode(true);
        const iconSpan = clone.querySelector('span');
        if (iconSpan) iconSpan.remove();
        eventType = clone.innerText.trim();
      }

      const lieuDiv = tr.querySelector('.col-sm-9 > div:not(.hidden-xs)');
      const lieuText = lieuDiv
        ? lieuDiv.innerText.replace(/\s+/g, ' ').trim()
        : null;
      const lieuMatch = lieuText ? lieuText.match(/^(.+?)\s*\((\d+)\)/) : null;
      const city = lieuMatch ? lieuMatch[1].trim() : lieuText;
      const departementNumber = lieuMatch ? parseInt(lieuMatch[2], 10) : null;

      const nbEpreuvesEl = tr.querySelector('.badge');
      const numberOfRaceVariants = nbEpreuvesEl
        ? parseInt(nbEpreuvesEl.innerText, 10)
        : null;

      const siteWebEl = tr.querySelector('a[target="_blank"]');
      const eventLink = siteWebEl ? siteWebEl.href : null;

      const registrationLink = link.href;

      const btnEl = tr.querySelector('td.vert-align a');
      let registrationStatus;
      if (btnEl) {
        if (btnEl.classList.contains('btn-success'))
          registrationStatus = 'open';
        else if (btnEl.classList.contains('btn-warning'))
          registrationStatus = 'not_open_yet';
        else if (btnEl.classList.contains('btn-danger'))
          registrationStatus = 'closed';
        else registrationStatus = 'unknown';
      } else {
        registrationStatus = 'unavailable';
      }

      result.push({
        place: 'unknown',
        comp,
        dateString,
        name,
        city,
        departementNumber,
        eventType,
        registrationStatus,
        registrationLink,
        eventLink,
        numberOfRaceVariants,
      });
    }

    return result;
  });

  const uniqueMap = new Map();
  for (const ev of events) {
    if (ev.comp) {
      uniqueMap.set(ev.comp, {
        place: ev.place,
        ...frenchDateToIsoDate(ev.dateString),
        comp: ev.comp,
        name: ev.name,
        city: ev.city,
        departementNumber: ev.departementNumber,
        eventType: findEventType(ev.eventType),
        registrationStatus: ev.registrationStatus,
        registrationLink: ev.registrationLink,
        eventLink: ev.eventLink,
        numberOfRaceVariants: ev.numberOfRaceVariants,
      });
    }
  }

  const dedupedEvents = Array.from(uniqueMap.values()).map(
    ({ comp, ...rest }) => rest,
  );

  console.log(
    `[EC] Trouvé ${events.length} évenements sur https://www.espace-competition.com/index.php?module=accueil&action=agenda`,
    `[EC] Du ${new Date(events.at(0)?.beginning).toLocaleString('fr-FR')} au ${new Date(events.at(-1)?.beginning).toLocaleString('fr-FR')}`,
  );

  return dedupedEvents;
}
