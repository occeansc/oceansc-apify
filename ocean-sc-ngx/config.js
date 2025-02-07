// config.js
export default {
    baseUrl: process.env.BASE_URL || 'https://ngxgroup.com/exchange/data/equities-price-list/', // From env variable or default
    tableSelector: process.env.TABLE_SELECTOR || '.table-responsive', // From env variable or default
    rowSelector: process.env.ROW_SELECTOR || 'tr', // From env variable or default
    showAllSelector: process.env.SHOW_ALL_SELECTOR || 'select[name="latestdiclosuresEquities_length"]', // From env variable or default
    fields: [
        'symbol', 'lastPrice', 'openingPrice', 'high', 'low', 'close',
        'change', 'trades', 'volume', 'value', 'tradeDate'
    ],
    outputFilename: process.env.OUTPUT_FILENAME || 'stock_data.csv', // From env variable or default
    validationRules: {
        minPrice: 0.01,
        maxPrice: 1000000,
        maxVolume: 1e12,
    },
    // The following are now handled by the scraping middleware
    // userAgents: [
    //     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    //     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    //     'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    //     // Add more user agents here if needed
    // ],
    // maxRetries: 5,  // Handled by error handler
    // retryMultiplier: 2, // Handled by error handler
    // blockDetection: { // Block detection is now more complex and handled in the scraping middleware
    //     captchaSelectors: ['#captcha', '.captcha-container'],
    //     blockSelectors: ['.access-denied', '.ip-blocked'],
    //     blockCheckInterval: 5000
    // },
    // waitForSelectorTimeout: 60000, // Now handled by individual calls to robustSelectorAction
    // navigationTimeoutSecs: 120, // Now handled by the scrape function's timeout
    // minDelay: 5000,  // Now randomized in the scraping middleware
    // maxDelay: 15000, // Now randomized in the scraping middleware
};