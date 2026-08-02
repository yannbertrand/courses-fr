export async function listFutureEvents(nbMois, { page }) {
  const now = new Date();
  const limitDate = new Date(now);
  limitDate.setMonth(limitDate.getMonth() + nbMois);

  const baseUrl = 'https://www.timepulse.fr';

  await page.goto(`${baseUrl}/calendrier`, {
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
        if (!timeEl || !h2) return;

        // Extraire tous les jours (gère "22 et 23 août" et "22 août")
        const timeText = timeEl.textContent.trim();
        const dayMatches = timeText.match(/\d{1,2}/g);
        if (!dayMatches) return;

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
            eventType = await window.findEventType(discMatch[1].trim());
          }
        }

        const links = article.querySelectorAll('.bt-wrap a');
        let eventLink = null;
        let registrationLink = null;

        links.forEach((a) => {
          const href = a.getAttribute('href');
          if (href.includes('#epreuve')) {
            registrationLink = href;
          } else {
            eventLink = href;
          }
        });

        if (!eventLink) return;

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
          registrationLink,
        });
      }
    }

    return results;
  });

  return rawEvents
    .map((ev) => {
      const pad = (n) => String(n).padStart(2, '0');

      const beginningStr = `${ev.year}-${pad(ev.month)}-${pad(ev.beginDay)}`;
      const endingStr = `${ev.year}-${pad(ev.month)}-${pad(ev.endDay)}`;

      // Pour la comparaison avec now/limitDate, on utilise Date.UTC pour éviter tout décalage
      const beginDate = new Date(Date.UTC(ev.year, ev.month - 1, ev.beginDay));

      if (beginDate < now || beginDate > limitDate) return null;

      const eventLink = ev.eventLink.startsWith('http')
        ? ev.eventLink
        : `${baseUrl}${ev.eventLink}`;
      const registrationLink = ev.registrationLink
        ? ev.registrationLink.startsWith('http')
          ? ev.registrationLink
          : `${baseUrl}${ev.registrationLink}`
        : null;

      return {
        place: ev.place,
        city: ev.city,
        beginning: beginningStr,
        ending: endingStr,
        departementNumber: ev.departementNumber,
        eventLink,
        eventType: ev.eventType,
        name: ev.name,
        numberOfRaceVariants: 'unknown',
        registrationLink: registrationLink || eventLink,
        registrationStatus: registrationLink ? 'open' : 'unknown',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.beginning.localeCompare(b.beginning));
}
