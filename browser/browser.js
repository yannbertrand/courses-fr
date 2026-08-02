import { launch } from 'puppeteer';
import { findEventType } from '../sources/utils/event-type-finder.js';
import { frenchDateToIsoDate } from '../sources/utils/french-date.js';

export async function getBrowserPage(mockData = undefined) {
  const browser = await launch({
    headless: true,
    browser: 'firefox',
  });
  const page = await browser.newPage();
  await page.exposeFunction('findEventType', findEventType);
  await page.exposeFunction('frenchDateToIsoDate', frenchDateToIsoDate);

  if (mockData !== undefined) {
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const url = request.url();

      if (mockData[url]) {
        request.respond({
          status: mockData[url].status || 200,
          contentType: mockData[url].contentType || 'text/html',
          body: mockData[url].body,
        });
      } else {
        request.abort();
      }
    });
  }

  return { browser, page };
}
