import { findEventType } from './event-type-finder.js';

/** Normalize a possibly-relative link into an absolute URL. */
export function absoluteUrl(link, baseUrl) {
  if (!link) return null;
  return link.startsWith('http') ? link : `${baseUrl}${link}`;
}

/** Parse "City Name (35)" / "City, Region (35)" into { city, departementNumber }. */
export function parseLocation(text) {
  if (!text) return { city: null, departementNumber: null };
  const m = text.trim().match(/^(.+?)(?:,\s*.+?)?\s*\((\d{2,3})\)$/);
  if (!m) return { city: text.trim(), departementNumber: null };
  return { city: m[1].trim(), departementNumber: parseInt(m[2], 10) };
}

/** Fill the standard event shape with sensible defaults, mapping eventType. */
export function normalizeEvent(raw) {
  return {
    place: 'unknown',
    city: null,
    departementNumber: null,
    eventType: 'unknown',
    numberOfRaceVariants: 'unknown',
    registrationLink: '',
    registrationStatus: 'unknown',
    ...raw,
    eventType: findEventType(raw.eventType),
  };
}

/** Standard end-of-run summary log + date sort. */
export function finalizeEvents(tag, url, events) {
  console.log('a');
  const sortedEvents = sortEvents(events);
  console.log('b');
  const fmt = (ts) => new Date(ts).toLocaleString('fr-FR');
  console.log('');
  console.log(`[${tag}] Trouvé ${sortedEvents.length} événements sur ${url}`);
  if (sortedEvents.length) {
    console.log(
      `[${tag}]  Du ${fmt(sortedEvents[0].beginning)} au ${fmt(sortedEvents.at(-1).beginning)}`,
    );
  }
  console.log('');
  return sortedEvents;
}

/**
 *
 * @param {Array<{eventLink: string}>} events
 * @returns {Array} un nouveau tableau dédupliqué
 */
export function dedupeEvents(events) {
  const seen = new Set();
  return events.filter((ev) => {
    const key = ev.eventLink;
    if (key == null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Trie un tableau d'événements :
 * 1. par `beginning` (croissant)
 * 2. à égalité, par `ending` (croissant)
 * 3. à égalité, par `name` (alphabétique, insensible à la casse)
 *
 * @param {Array<{beginning: number, ending: number, name: string}>} events
 * @returns {Array} un nouveau tableau trié (ne mute pas l'entrée)
 */
export function sortEvents(events = []) {
  return [...events].sort((a, b) => {
    const diffBeginning = a.beginning - b.beginning;
    if (diffBeginning !== 0) return diffBeginning;

    const diffEnding = a.ending - b.ending;
    if (diffEnding !== 0) return diffEnding;

    return String(a.name).localeCompare(String(b.name), 'fr', {
      sensitivity: 'base',
    });
  });
}
