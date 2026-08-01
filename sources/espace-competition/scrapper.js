export async function listFutureEvents(nbMois = 12, { page }) {
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

  console.log(`Chargement du mois initial (1/${nbMois})...`);

  for (let i = 2; i <= nbMois; i++) {
    console.log(`Chargement du mois suivant (${i}/${nbMois})...`);

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

  console.log('Extraction des événements...');

  const events = await page.evaluate(() => {
    const slugify = (str) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const result = [];
    document.querySelectorAll('tbody > tr').forEach((tr) => {
      const link = tr.querySelector('h4 a[href*="module=inscription"]');
      if (!link) return;

      const comp = new URL(link.href, location.origin).searchParams.get('comp');
      const name = link.innerText.trim();

      const dateDiv = tr.querySelector('.col-sm-3 div:nth-child(2)');
      const { beginning, ending } = dateDiv
        ? frenchDateToIsoDate(dateDiv.innerText.trim())
        : null;
      function frenchDateToIsoDate(dateString) {
        const mois = {
          janvier: 1,
          février: 2,
          mars: 3,
          avril: 4,
          mai: 5,
          juin: 6,
          juillet: 7,
          août: 8,
          septembre: 9,
          octobre: 10,
          novembre: 11,
          décembre: 12,
        };

        const regex = /(\d{1,2})(?: - (\d{1,2}))?\s+([A-ZÀ-ÿ]+)\s+(\d{4})/i;
        const match = dateString.match(regex);

        if (!match) throw new Error(`Format invalide: ${dateString}`);

        const [, beginningDay, endingDay, moisStr, year] = match;
        const moisIndex = mois[moisStr.toLowerCase()];

        if (moisIndex === undefined)
          throw new Error(`Mois invalide: ${moisStr}`);

        const beginning = `${year}-${`${moisIndex}`.padStart(2, '0')}-${beginningDay.padStart(2, '0')}`;
        return {
          beginning: beginning,
          ending: endingDay
            ? `${year}-${`${moisIndex}`.padStart(2, '0')}-${endingDay.padStart(2, '0')}`
            : beginning,
        };
      }

      const discEl = tr.querySelector('.col-sm-3 i.text-muted');
      let eventTypeRaw = null;
      if (discEl) {
        // Clone pour ne pas toucher au DOM réel, puis on retire le <span> icône
        const clone = discEl.cloneNode(true);
        const iconSpan = clone.querySelector('span');
        if (iconSpan) iconSpan.remove();
        eventTypeRaw = clone.innerText.trim();
      }
      const eventType = eventTypeRaw ? slugify(eventTypeRaw) : null;

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
      let registrationStatus = null;
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
        beginning,
        ending,
        name,
        city,
        departementNumber,
        eventType,
        registrationStatus,
        registrationLink,
        eventLink,
        numberOfRaceVariants,
      });
    });
    return result;
  });

  const uniqueMap = new Map();
  for (const ev of events) {
    if (ev.comp) uniqueMap.set(ev.comp, ev);
  }

  return Array.from(uniqueMap.values()).map(({ comp, ...rest }) => rest);
}
