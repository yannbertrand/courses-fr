import {
  absoluteUrl,
  finalizeEvents,
  getDateRange,
  isInRange,
  normalizeEvent,
} from '../utils/scrapper-common.js';

const BASE_URL = 'https://www.timepulse.fr';

export async function listFutureEvents(nbMois, { page }) {
  const { now, limitDate } = getDateRange(nbMois);
  console.log(`[TP] Récupération des événements`);

  limitDate.setMonth(limitDate.getMonth() + nbMois);

  await page.goto(`${BASE_URL}/calendrier`, {
    waitUntil: 'networkidle2',
  });

  const rawEvents = await page.evaluate(async () => {
    const results = [];

    const panels = Array.from(document.querySelectorAll('div[id]')).filter(
      (el) => /^\d{1,2}_\d{4}$/.test(el.id),
    );

    for (const panel of panels) {
      const [month, year] = panel.id.split('_').map(Number);

      const articles = panel.querySelectorAll('article');

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        const h2 = article.querySelector('h2');
        if (!timeEl || !h2) continue;

        // Extraire tous les jours (gère "22 et 23 août" et "22 août")
        const timeText = timeEl.textContent.trim();
        const dayMatches = timeText.match(/\d{1,2}/g);
        if (!dayMatches) continue;

        const beginDay = parseInt(dayMatches[0], 10);
        const endDay = parseInt(dayMatches[dayMatches.length - 1], 10);

        // Titre : cloner h2 et retirer le <span> pour ne garder que le nom
        const h2Clone = h2.cloneNode(true);
        const spanInH2 = h2Clone.querySelector('span');
        if (spanInH2) spanInH2.remove();
        const name = h2Clone.textContent.trim();

        const infosBlocks = article.querySelectorAll('.infos');
        let place = null;
        let city = null;
        let departementNumber = null;
        let eventType = null;

        for (const block of infosBlocks) {
          const text = block.textContent;
          const lieuMatch = text.match(/Lieu\s*:\s*(.+?)(?:\s*Ville\s*:|$)/s);
          const villeMatch = text.match(/Ville\s*:\s*(.+?)\s*\((\d{2,3})\)/s);
          const discMatch = text.match(/Discipline\s*:\s*(.+)/s);

          if (lieuMatch) place = lieuMatch[1].trim().replace(/\s+/g, ' ');
          if (villeMatch) {
            city = villeMatch[1].trim();
            departementNumber = parseInt(villeMatch[2], 10);
          }
          if (discMatch) {
            eventType = discMatch[1].trim();
          }
        }

        const links = article.querySelectorAll('.bt-wrap a');
        let eventLink = null;
        let hasRegistrationLink = false;

        links.forEach((a) => {
          const href = a.getAttribute('href');
          if (href.includes('#epreuve')) {
            hasRegistrationLink = true;
          } else {
            eventLink = href;
          }
        });

        if (!eventLink) continue;

        results.push({
          beginDay,
          endDay,
          month,
          year,
          name,
          place,
          city,
          departementNumber,
          eventType,
          eventLink,
          hasRegistrationLink,
        });
      }
    }

    return results;
  });

  const events = rawEvents
    .map((ev) => {
      const pad = (n) => String(n).padStart(2, '0');
      const beginning = new Date(
        `${ev.year}-${pad(ev.month)}-${pad(ev.beginDay)}`,
      ).getTime();
      const ending = new Date(
        `${ev.year}-${pad(ev.month)}-${pad(ev.endDay)}`,
      ).getTime();
      if (!isInRange(beginning, { now, limitDate })) return null;

      return normalizeEvent({
        beginning,
        ending,
        place: ev.place,
        city: ev.city,
        departementNumber: ev.departementNumber,
        eventType: ev.eventType,
        name: ev.name,
        eventLink: absoluteUrl(ev.eventLink, BASE_URL),
        registrationStatus: ev.hasRegistrationLink ? 'open' : 'unknown',
      });
    })
    .filter(Boolean);

  return finalizeEvents('TP', `${BASE_URL}/calendrier`, events);
}
