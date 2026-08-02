import { vi } from 'vitest';

export function mockFetch(routes) {
  const fetchMock = vi.fn(async (input) => {
    const url = input.toString();

    const route = routes.find((r) =>
      typeof r.match === 'string' ? url.startsWith(r.match) : r.match.test(url),
    );

    if (!route) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(route.response, {
      status: route.status ?? 200,
      headers: { 'Content-Type': route.format },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
