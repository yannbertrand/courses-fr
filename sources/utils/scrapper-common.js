import { findEventType } from './event-type-finder.js';

/** Normalize a possibly-relative link into an absolute URL. */
export function absoluteUrl(link, baseUrl) {
  if (!link) return null;
  return link.startsWith('http') ? link : `${baseUrl}${link}`;
}

/** Parse "City Name (35)" / "City, Region (35)" into { city, departementNumber }. */
export function parseLocation(text) {
  if (!text) return { city: null, departementNumber: null };
  const m = text.match(/^(.+?)(?:,\s*.+?)?\s*\((\d{2,3})\)$/);
  if (!m) return { city: text.trim(), departementNumber: null };
  return { city: m[1].trim(), departementNumber: parseInt(m[2], 10) };
}

/** Fill the standard event shape with sensible defaults, mapping eventType. */
export function normalizeEvent(raw) {
  return {
    place: 'unknown',
    city: null,
    departementNumber: null,
    numberOfRaceVariants: 'unknown',
    registrationLink: '',
    registrationStatus: 'unknown',
    ...raw,
    eventType: findEventType(raw.eventType),
  };
}

/** Standard end-of-run summary log + date sort. */
export function finalizeEvents(tag, url, events) {
  events.sort((a, b) => a.beginning - b.beginning);
  const fmt = (ts) => new Date(ts).toLocaleString('fr-FR');
  console.log('');
  console.log(`[${tag}] Trouvé ${events.length} événements sur ${url}`);
  if (events.length) {
    console.log(
      `[${tag}]  Du ${fmt(events[0].beginning)} au ${fmt(events.at(-1).beginning)}`,
    );
  }
  console.log('');
  return events;
}
