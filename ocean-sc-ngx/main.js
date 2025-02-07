import { PuppeteerCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import winston from 'winston';
import config from './config.js'; // Import configuration

// Winston logging setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
    ],
});

async function selectAll(page) {
    try {
        await page.waitForSelector(config.showAllSelector, { timeout: config.waitForSelectorTimeout });
        await page.select(config.showAllSelector, '-1');
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
            if (i === 0) return; // Skip header row

            const cells = $(row).find('td');
            const rowData = {};

            config.fields.forEach((field, index) => {
                rowData[field] = $(cells[index]).text().trim();
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

async function saveData(stockData, filename) {
    try {
        const jsonData = JSON.stringify(stockData, null, 2);
        fs.writeFileSync(filename, jsonData, 'utf8');
        logger.info(`Data saved to ${filename}`);
    } catch (error) {
        logger.error('Error saving data:', error);
        throw error;
    }
}

const crawler = new PuppeteerCrawler({
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox'],
            userAgent: config.userAgent, // Use user agent from config
        },
    },
    requestHandler: async ({ page, request }) => {
        logger.info(`Processing ${request.url}`);

        try {
            await page.goto(request.url, { waitUntil: 'networkidle2', timeout: config.navigationTimeoutSecs * 1000 });

            await selectAll(page);
            await waitForTable(page);

            const stockData = await scrapeData(page);

            // Remove or replace the data delay notice code:
            // const notice = await page.$eval(config.dataDelayNoticeSelector, el => el.textContent.trim());
            // if (notice) {
            //     logger.info(`Data delay warning: ${notice}`);
            // }

            await saveData(stockData, config.outputFilename);

        } catch (error) {
            logger.error(`Error in requestHandler:`, error);
        }
    },
    failedRequestHandler: async ({ request }) => {
        logger.warn(`Request ${request.url} failed`);
    },
    requestHandlerTimeoutSecs: 120,
    maxRequestRetries: 3,
});

async function main() {
    try {
        logger.info('Starting crawler...');
        await crawler.addRequests([config.url]);
        await crawler.run();
        logger.info('Crawler finished successfully.');
    } catch (error) {
        logger.error('Crawler failed:', error);
    }
}

main();