export default {
    url: 'https://ngxgroup.com/exchange/data/equities-price-list/',
    tableSelector: '.table-responsive',
    rowSelector: 'tr',
    waitForSelectorTimeout: 60000,
    navigationTimeoutSecs: 120,
    maxConcurrency: 1,
    dataDelayNoticeSelector: '.data-delay-notice',
    fields: [
        'symbol', 'lastPrice', 'openingPrice', 'high', 'low', 'close',
        'change', 'trades', 'volume', 'value', 'tradeDate'
    ],
    showAllSelector: 'select[name="latestdiclosuresEquities_length"]',
    allOptionSelector: 'select[name="latestdiclosuresEquities_length"] option[value="-1"]',
    outputFilename: 'stock_data.json',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', // Update with your actual user agent
};