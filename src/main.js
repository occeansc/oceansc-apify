import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import cheerio from 'cheerio';

await Actor.init();

const crawler = new PuppeteerCrawler({
    async requestHandler({ page, request, crawler }) {
        try {
            // Access the browser pool and set launch options
            crawler.browserPool.launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
            crawler.browserPool.launchOptions.executablePath = '/usr/bin/chromium-browser'; // Or /usr/bin/chromium if needed

            await page.goto('https://ngxgroup.com/exchange/data/equities-price-list/');

            // Wait for the table to load (adjust timeout if needed)
            await page.waitForSelector('table.table-responsive');

            // Select "All" from the dropdown (Ocean's crucial point)
            const selectElement = await page.$('select[name="latestdisclosuresEquities_length"]'); // Select by name
            if (selectElement) {
                await selectElement.select('-1'); // Select "-1" for "All"
                await page.waitForTimeout(5000); // Wait for data refresh (adjust as needed)
            } else {
                console.warn('Dropdown element not found.');
            }

            // **CRITICAL CHANGE: Get HTML from Puppeteer and then load Cheerio**
            const html = await page.content();  // Get the rendered HTML from Puppeteer
            const $ = cheerio.load(html);       // Load Cheerio with the rendered HTML

            // Now, use Cheerio to find the wdtNonce (and update the regex if needed)
            const scriptTag = $('script', 'body').filter(function() {
                return $(this).text().includes('wdtNonce');
            }).text();

            const nonceMatch = scriptTag.match(/wdtNonce\s*=\s*['"]([a-f0-9]+)['"]/); // Update regex if needed
            const wdtNonce = nonceMatch ? nonceMatch[1] : null;

            if (!wdtNonce) {
                throw new Error('Could not find wdtNonce');
            }

            // ... (Rest of the code to make the API request and push data remains the same)
            const apiResponse = await Apify.utils.request({
                url: 'https://ngxgroup.com/wp-admin/admin-ajax.php',
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                data: {
                    action: 'get_wd_table',
                    table_id: '31',
                    wdtNonce: wdtNonce,
                },
                timeoutSecs: 30,
                json: true, // Automatically parse the JSON response
            });

            // 3. Extract and push the data
            if (apiResponse && apiResponse.data && apiResponse.columns) {
                const stockData = apiResponse.data.map(item => {
                    const dataItem = {};
                    apiResponse.columns.forEach((col, index) => {
                        dataItem[col.title] = item[index];
                    });
                    return dataItem;
                });

                await Actor.pushData(stockData);

            } else {
                console.error('Invalid or missing data in API response:', apiResponse);
            }


        } catch (error) {
            console.error('Error during scraping:', error);
        }
    },
});

await crawler.run(['https://ngxgroup.com/exchange/data/equities-price-list/']);

console.log('Crawler finished.');
await Actor.exit();
