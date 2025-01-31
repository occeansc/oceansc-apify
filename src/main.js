const Apify = require('apify');

Apify.main(async () => {
    const url = 'https://ngxgroup.com/exchange/data/equities-price-list/';
    const dataset = await Apify.openDataset('ocean-sc-ngx-data'); // Open the dataset

    try {
        const response = await Apify.utils.request({ url });
        const $ = Apify.utils.cheerio.load(response.body); // Load HTML with Cheerio (like BeautifulSoup)

        const data = [];
        $('table.wpDataTable tbody tr').each((i, row) => {  // Iterate through table rows
            if (i === 0) return; // Skip header row
            const rowData = {};
            $(row).find('td').each((j, cell) => {  // Iterate through cells in each row
                const headerText = $('table.wpDataTable thead tr th').eq(j).text().trim(); // Get header text
                rowData[headerText] = $(cell).text().trim();
            });
            data.push(rowData);
        });


        await dataset.pushData(data); // Store the extracted data
        console.log('Data scraped and saved to Apify dataset.');

    } catch (error) {
        console.error(`Error scraping data: ${error}`);
        throw error; // Re-throw the error to indicate failure in Apify
    }
});
