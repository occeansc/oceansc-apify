import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import cheerio from 'cheerio'; // Import cheerio

await Actor.init();

const crawler = new PuppeteerCrawler({
    async requestHandler({ page, request }) {
        try {
            await page.goto('https://ngxgroup.com/exchange/data/equities-price-list/');

            // Wait for the table to load (adjust timeout if needed)
            await page.waitForSelector('table.table-responsive'); // Or a more specific selector

            // Select "All" from the dropdown (Ocean's crucial point)
            const selectElement = await page.$('select[name="latestdisclosuresEquities_length"]'); // Select by name
            if (selectElement) {
                await selectElement.select('-1'); // Select "-1" for "All"
                await page.waitForTimeout(5000); // Wait for data refresh (adjust as needed)
            } else {
                console.warn('Dropdown element not found.');
            }

            // Extract data using Cheerio (after the table is fully loaded)
            const $ = cheerio.load(await page.content()); // Use page.content()

            const stockData = [];
            $('tr').each((i, row) => {
                const cells = $(row).find('td');
                if (cells.length > 0) {
                    const symbol = $(cells[0]).text().trim();
                    const price = $(cells[1]).text().trim();
                    if (symbol && price) {
                        stockData.push({
                            symbol,
                            price,
                        });
                    }
                }
            });

            await Actor.pushData(stockData);
            console.log(`Scraped ${stockData.length} items.`);

        } catch (error) {
            console.error('Error during scraping:', error);
        }
    },
});

await crawler.run(['https://ngxgroup.com/exchange/data/equities-price-list/']);

console.log('Crawler finished.');
await Actor.exit();
