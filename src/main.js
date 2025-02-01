import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import cheerio from 'cheerio';
import Ajv from 'ajv';

await Actor.init();

// Configuration (with environment variable overrides)
const CONFIG = {
    baseUrl: process.env.NGX_BASE_URL || 'https://ngxgroup.com/exchange/data/equities-price-list/',
    selectors: {
        table: process.env.NGX_TABLE_SELECTOR || 'table.table-responsive', // Make selectors configurable!
        lengthSelect: process.env.NGX_LENGTH_SELECT || 'select[name="latestdisclosuresEquities_length"]', // Make selectors configurable!
    },
    retryCount: parseInt(process.env.RETRY_COUNT) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 5000,
    pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT) || 60000,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    apiSchema: { // JSON schema for API response validation (highly recommended)
        type: 'object',
        properties: {
            data: {
                type: 'array',
                items: {
                    type: 'array',
                },
            },
            columns: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                    },
                    required: ['title'],
                },
            },
        },
        required: ['data', 'columns'],
    },
};

const ajv = new Ajv();
const validateApiResponse = ajv.compile(CONFIG.apiSchema);

// Utility functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const extractWdtNonce = ($) => {
    const scriptTag = $('script', 'body').filter(function() {
        return $(this).text().includes('wdtNonce');
    }).text();

    const nonceMatch = scriptTag.match(/wdtNonce\s*=\s*['"]([a-f0-9]+)['"]/); // Robust regex
    return nonceMatch ? nonceMatch[1] : null;
};

const fetchStockData = async (wdtNonce, retryCount = 0) => {
    try {
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
                wdtNonce,
            },
            timeoutSecs: CONFIG.requestTimeout / 1000, // Timeout in seconds
            json: true,
        });

        if (!validateApiResponse(apiResponse)) {
            console.error('Invalid API response format:', validateApiResponse.errors);
            throw new Error('Invalid API response format');
        }
        return apiResponse;

    } catch (error) {
        console.error('Error fetching stock data:', error); // More specific error message
        if (retryCount < CONFIG.retryCount) {
            console.log(`API request failed, attempt ${retryCount + 1}/${CONFIG.retryCount}. Retrying in ${CONFIG.retryDelay}ms...`);
            await delay(CONFIG.retryDelay);
            return fetchStockData(wdtNonce, retryCount + 1);
        }
        throw error; // Re-throw after retries fail
    }
};

const processApiResponse = (response) => {
    return response.data.map(item => {
        const dataItem = {};
        response.columns.forEach((col, index) => {
            const value = item[index];
            dataItem[col.title] = typeof value === 'string' ? value.trim() : value; // Trim strings
        });
        return dataItem;
    });
};

const crawler = new PuppeteerCrawler({
    async requestHandler({ page, request, crawler }) {
        try {
            crawler.browserPool.launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
            crawler.browserPool.launchOptions.executablePath = process.env.APIFY_CHROME_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

            let navigationAttempts = 0;
            while (navigationAttempts < CONFIG.retryCount) {
                try {
                    await page.goto(CONFIG.baseUrl, { timeout: CONFIG.pageLoadTimeout });
                    break;
                } catch (error) {
                    navigationAttempts++;
                    if (navigationAttempts === CONFIG.retryCount) throw error;
                    console.error(`Page navigation failed, attempt ${navigationAttempts + 1}/${CONFIG.retryCount}. Retrying in ${CONFIG.retryDelay}ms...`);
                    await delay(CONFIG.retryDelay);
                }
            }

            await page.waitForSelector(CONFIG.selectors.table, { timeout: CONFIG.pageLoadTimeout });

            const selectElement = await page.$(CONFIG.selectors.lengthSelect);
            if (selectElement) {
                await selectElement.select('-1');
                await page.waitForTimeout(5000); // Wait after selecting "All"
            } else {
                console.warn('Dropdown element not found.');
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            const wdtNonce = extractWdtNonce($);
            if (!wdtNonce) {
                throw new Error('Failed to extract wdtNonce');
            }

            const apiResponse = await fetchStockData(wdtNonce);
            const stockData = processApiResponse(apiResponse);

            await Actor.pushData(stockData);

        } catch (error) {
            console.error('Crawler error:', {
                message: error.message,
                stack: error.stack,
                url: request.url,
            });
            throw error; // Let Crawlee handle retries based on maxRequestRetries
        }
    },
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
});

try {
    await crawler.run([CONFIG.baseUrl]);
    console.log('Crawler finished successfully.');
} catch (error) {
    console.error('Crawler failed:', error);
    throw error;
} finally {
    await Actor.exit();
}
