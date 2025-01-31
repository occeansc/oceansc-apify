// src/main.js
import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

const crawler = new CheerioCrawler({
    async requestHandler({ $, request }) {
        const stockData = [];
        $('tr').each((i, row) => {
            const cells = $(row).find('td');
            stockData.push({
                symbol: $(cells[0]).text().trim(),
                price: $(cells[1]).text().trim(),
                // Add other fields as needed (e.g., volume, change)
            });
        });
        await Actor.pushData(stockData);
    },
});

try {  // Error handling
    await crawler.run(['https://ngxgroup.com/exchange/data/equities-price-list/']);
} catch (error) {
    console.error('Crawler encountered an error:', error);
    await Actor.exit({ exitCode: 1 });
}

console.log('Crawler finished.'); // Logging
await Actor.exit();
