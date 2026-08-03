export function findEventType(str) {
  if (!str || typeof str !== 'string') return 'unknown';
  const slug = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'unknown';
}
