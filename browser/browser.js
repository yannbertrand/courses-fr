import { launch } from 'puppeteer';

export async function getBrowserPage(mockData = undefined) {
  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });

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
