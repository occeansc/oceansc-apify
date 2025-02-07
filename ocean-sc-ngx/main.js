// main.js
import { PuppeteerCrawler } from 'crawlee';
import { errorHandler } from './error-handler.js';
import { politeScraping } from './scraping-middleware.js';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { Parser } from 'json2csv';

const config = {
    baseUrl: process.env.BASE_URL || 'https://ngxgroup.com/exchange/data/equities-price-list/',
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '1'),
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    tableSelector: process.env.TABLE_SELECTOR || '.table-responsive',
    rowSelector: process.env.ROW_SELECTOR || 'tr',
    showAllSelector: process.env.SHOW_ALL_SELECTOR || 'select[name="latestdiclosuresEquities_length"]',
    fields: [
        'symbol', 'lastPrice', 'openingPrice', 'high', 'low', 'close',
        'change', 'trades', 'volume', 'value', 'tradeDate'
    ],
    outputFilename: process.env.OUTPUT_FILENAME || 'stock_data.csv',
    validationRules: {
        minPrice: 0.01,
        maxPrice: 1000000,
        maxVolume: 1e12,
    },
};

class Scraper {
    constructor() {
        this.crawler = new PuppeteerCrawler({
            launchOptions: {
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            requestFunction: async ({ request, page }) => {
                try {
                    await page.setUserAgent(politeScraping.getRandomUserAgent());
                    const content = await page.content();
                    const $ = cheerio.load(content);
                    const stockData = [];
                    let validCount = 0;
                    let invalidCount = 0;

                    $(config.tableSelector).find(config.rowSelector).each((i, row) => {
                        if (i === 0) return;

                        const cells = $(row).find('td');
                        const rowData = {};

                        config.fields.forEach((field, index) => {
                            try {
                                let value = $(cells[index]).text();
                                const type = ['lastPrice', 'openingPrice', 'high', 'low', 'close', 'change', 'trades', 'volume', 'value'].includes(field)
                                    ? 'number'
                                    : 'string';

                                if (field === 'symbol') {
                                    value = value.replace(/\[.*\]/g, '').trim();
                                }

                                const cleaned = this.cleanAndValidate(value, type, field);
                                rowData[field] = cleaned;

                                if (cleaned === null && type === 'number') invalidCount++;
                                else validCount++;

                            } catch (fieldError) {
                                errorHandler.handleError(fieldError, { field, row: i });
                                rowData[field] = null;
                                invalidCount++;
                            }
                        });

                        if (Object.values(rowData).some(v => v !== null)) {
                            stockData.push(rowData);
                        }
                    });

                    errorHandler.log(`Data quality: ${validCount} valid / ${invalidCount} invalid fields`);

                    if (stockData.length === 0) {
                        throw new Error('No valid data scraped');
                    }

                    return stockData;

                } catch (error) {
                    errorHandler.handleError(error, { context: "scrapeData" });
                    throw error;
                }
            }
        });
    }


    cleanAndValidate(value, type, field) {
        if (value === '--' || value === null || value === undefined) return null;

        const trimmed = value.toString().trim();
        if (trimmed === '') return null;

        if (type === 'number') {
            const num = parseFloat(trimmed.replace(/,/g, ''));
            if (isNaN(num)) return null;

            if (field.includes('Price') && (num < config.validationRules.minPrice || num > config.validationRules.maxPrice)) {
                errorHandler.log.warn(`Price validation failed for ${field}: ${num}`);
                return null;
            }

            if (field === 'volume' && num > config.validationRules.maxVolume) {
                errorHandler.log.warn(`Volume validation failed: ${num}`);
                return null;
            }

            return num;
        }

        return trimmed;
    }

    async saveData(data) {
        try {
            const parser = new Parser({ fields: config.fields });
            const csv = parser.parse(data);

            fs.writeFileSync(config.outputFilename, csv, 'utf8');

            errorHandler.log(`Data saved to ${config.outputFilename}`);

        } catch (error) {
            errorHandler.handleError(error, { context: "saveData" });
            throw error;
        }
    }

    async scrape(url) {
        return errorHandler.withRetry(async () => {
            try {
                await this.crawler.addRequest({ url }); // Use crawler to add request
                await this.crawler.run(); // Start the crawler

            } finally {
                await this.crawler.browser.close(); // Close browser after crawling
            }
        }, {
            onFailedAttempt: async error => {
                errorHandler.handleError(error, { url });
                await new Promise(resolve =>
                    setTimeout(resolve, politeScraping.getRandomDelay())
                );
            }
        });
    }

    async monitor() {
        setInterval(() => {
            if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
                errorHandler.handleError(new Error('Memory threshold exceeded'));
                process.exit(1); // Let Docker restart the container
            }
        }, 60000);
    }
}

// Improved selector handling with retries (outside the class)
async function robustSelectorAction(page, selector, action = 'wait', options = {}) {
    const retryOptions = {
        retries: 5,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000
    };

    return await errorHandler.withRetry(async (bail) => {
        try {
            switch (action) {
                case 'wait':
                    return await page.waitForSelector(selector, {
                        timeout: config.timeout,
                        ...options
                    });
                case 'select':
                    await page.select(selector, options.value);
                    return true;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            if (error.message.includes('timeout')) {
                throw error;
            }
            bail(error);
        }
    }, retryOptions);
}


// Main execution
const scraper = new Scraper();
await scraper.monitor();

// Add your scraping workflow here. Use a loop or other logic if needed.
await scraper.scrape(config.baseUrl);


process.stdin.resume(); // Keep the process running (if needed) to allow monitor to work.