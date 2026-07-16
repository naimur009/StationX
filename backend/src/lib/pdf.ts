import puppeteer from 'puppeteer';

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    await page.setContent(html, { waitUntil: 'load' });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm',
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
