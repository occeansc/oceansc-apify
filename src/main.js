import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

const crawler = new CheerioCrawler({
    async requestHandler({ $, request }) {
        const stockData = [];
        $('table.table-responsive tr').each((i, row) => { // Updated selector
            const cells = $(row).find('td');
            if (cells.length > 0) { // Check for data cells
                const symbol = $(cells[0]).text().trim();
                const price = $(cells[1]).text().trim();
                if (symbol && price) { // Check for empty values
                    stockData.push({
                        symbol: symbol,
                        price: price,
                    });
                }
            }
        });
        await Actor.pushData(stockData);
    },
});

try {
    await crawler.run(['https://ngxgroup.com/exchange/data/equities-price-list/']);
} catch (error) {
    console.error('Crawler encountered an error:', error);
    await Actor.exit({ exitCode: 1 });
}

console.log('Crawler finished.');
await Actor.exit();
