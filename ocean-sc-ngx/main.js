// main.js
import { PuppeteerCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import winston from 'winston';
import { Parser } from 'json2csv';
import config from './config.js';
import { politeScraping } from './scraping-middleware.js';

// Winston logger setup (improved)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        // new winston.transports.File({ filename: 'ocean-sc-ngx.log' }), // Optional file logging
    ],
});

function cleanAndValidate(value, type, field) {
    if (value === '--' || value === null || value === undefined || value === '') {
        return null;
    }

    const trimmed = value.toString().trim();

    if (type === 'number') {
        const num = parseFloat(trimmed.replace(/,/g, ''));
        if (isNaN(num)) return null;

        if (field.includes('Price') && (num < config.validationRules.minPrice || num > config.validationRules.maxPrice)) {
            logger.warn(`Price validation failed for ${field}: ${num}`);
            return null;
        }

        if (field === 'volume' && num > config.validationRules.maxVolume) {
            logger.warn(`Volume validation failed: ${num}`);
            return null;
        }

        return num;
    }

    return trimmed;
}

async function selectAll(page) {
    try {
        await page.waitForSelector(config.showAllSelector, { timeout: config.waitForSelectorTimeout });
        await page.select(config.showAllSelector, '-1'); // Or the correct value to select "All"
        logger.info('Selected "All" from dropdown.');
    } catch (error) {
        logger.error('Error selecting "All":', error);
        throw error;
    }
}

async function waitForTable(page) {
    try {
        await page.waitForSelector(config.tableSelector, { timeout: config.waitForSelectorTimeout });
        logger.info('Table loaded.');
    } catch (error) {
        logger.error('Error waiting for table:', error);
        throw error;
    }
}

async function scrapeData(page) {
    try {
        const content = await page.content();
        const $ = cheerio.load(content);
        const stockData = [];

        $(config.tableSelector).find(config.rowSelector).each((i, row) => {
            if (i === 0) return;

            const cells = $(row).find('td');
            const rowData = {};

            config.fields.forEach((field, index) => {
                try {
                    let value = $(cells[index]).text().trim();

                    if (field === 'symbol') {
                        value = value.replace(/\[.*\]/g, '').trim();
                    }

                    const type = ['lastPrice', 'openingPrice', 'high', 'low', 'close', 'change', 'trades', 'volume', 'value'].includes(field) ? 'number' : 'string';

                    rowData[field] = cleanAndValidate(value, type, field);

                } catch (fieldError) {
                    logger.warn(`Error processing field ${field} in row ${i + 1}:`, fieldError);
                    rowData[field] = null;
                }
            });

            stockData.push(rowData);

        });

        logger.info(`Scraped ${stockData.length} items.`);
        return stockData;

    } catch (error) {
        logger.error('Error scraping data:', error);
        throw error;
    }
}

async function saveDataToCSV(stockData, filename) {
    try {
        const fields = config.fields;
        const parser = new Parser({ fields });
        const csv = parser.parse(stockData);

        fs.writeFileSync(filename, csv, 'utf8');
        logger.info(`Data saved to ${filename}`);
    } catch (error) {
        logger.error('Error saving data to CSV:', error);
        throw error;
    }
}

const crawler = new PuppeteerCrawler({
    launchContext: {
        launchOptions: {
            headless: config.headless || 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            userAgent: politeScraping.getRandomUserAgent(), // Use random user agent
        },
    },
    requestHandler: async ({ page, request, enqueue }) => {
        logger.info(`Processing ${request.url}`);

        try {
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: config.navigationTimeoutSecs * 1000 });

            await selectAll(page);
            await waitForTable(page);

            const stockData = await scrapeData(page);

            await saveDataToCSV(stockData, config.outputFilename);

        } catch (error) {
            logger.error(`Error in requestHandler:`, error);
        }
    },
    failedRequestHandler: async ({ request }) => {
        logger.warn(`Request ${request.url} failed`);
    },
    requestHandlerTimeoutSecs: 120,
    maxRequestRetries: 3,
    maxConcurrency: config.maxConcurrency,
});

async function main() {
    let crawlerInstance; // Store crawler instance

    try {
        logger.info('Starting crawler...');
        crawlerInstance = crawler;
        await crawlerInstance.addRequests([config.url]);
        await crawlerInstance.run();
        logger.info('Crawler finished successfully.');

    } catch (error) {
        logger.error('Crawler failed:', error);
    } finally {
        if (crawlerInstance && crawlerInstance.browser) {
            try {
                await crawlerInstance.browser.close();
                logger.info('Browser closed.');
            } catch (closeError) {
                logger.error('Error closing browser:', closeError);
            }
        }
    }
}

main();