// config.js
export default {
    url: 'https://ngxgroup.com/exchange/data/equities-price-list/', // <-- ADD THIS LINE!
    baseUrl: process.env.BASE_URL || 'https://ngxgroup.com/exchange/data/equities-price-list/',
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
    headless: process.env.HEADLESS || 'new', // or true or false
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 ...', // Or use a user agent library
    navigationTimeoutSecs: parseInt(process.env.NAVIGATION_TIMEOUT || '30'),
    waitForSelectorTimeout: parseInt(process.env.WAIT_FOR_SELECTOR_TIMEOUT || '30000'),
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '1'),
};