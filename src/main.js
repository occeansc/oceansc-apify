import { CheerioCrawler } from 'crawlee';
import { Actor } from 'apify'; // Correct import for Actor

await Actor.init();

const crawler = new CheerioCrawler({
    async requestHandler({ $, request }) {
        try {
            // 1. Get the wdtNonce
            const scriptTag = $('script', 'body').filter(function() {
                return $(this).text().includes('wdtNonce');
            }).text();

            const nonceMatch = scriptTag.match(/wdtNonce\s*=\s*['"]([a-f0-9]+)['"]/);
            const wdtNonce = nonceMatch ? nonceMatch[1] : null;

            if (!wdtNonce) {
                throw new Error('Could not find wdtNonce');
            }

            // 2. Make the API request
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
