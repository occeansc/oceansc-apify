const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');

const results = [];

fs.createReadStream('../ocean-sc-ngx/stock_data.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        const cleanedData = cleanData(results);
        const processedData = processData(cleanedData);

        const fields = Object.keys(processedData[0]);
        const csv = new Parser({ fields }).parse(processedData);
        fs.writeFileSync('processed_stock_data.csv', csv, 'utf8');

        console.log('Data processed and saved to processed_stock_data.csv');
    });

function cleanData(data) {
    return data.map(row => {
        const cleanedRow = {};
        for (const key in row) {
            let value = row[key];

            if (key === 'lastPrice' || key === 'openingPrice' || key === 'high' || key === 'low' || key === 'close' || key === 'change' || key === 'trades' || key === 'volume' || key === 'value') {
                value = parseFloat(value.replace(/,/g, ''));
                if (isNaN(value)) value = null;
            } else if (typeof value === 'string') {
                value = value.trim();
            }
            cleanedRow[key] = value;
        }
        return cleanedRow;
    });
}

function processData(data) {
    const processedData = data.map(row => ({ ...row }));

    // --- Price Change (Traditional Indicator) ---
    let bullishCount = 0;
    let bearishCount = 0;

    for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        if (!isNaN(row.change)) {
            if (row.change > 0) {
                bullishCount++;
            } else if (row.change < 0) {
                bearishCount++;
            }
        }
    }

    const overallSentiment = bullishCount > bearishCount ? "Bullish" : (bearishCount > bullishCount ? "Bearish" : "Neutral");

    // --- Volume (Traditional Indicator) ---
    const totalVolume = processedData.reduce((sum, row) => sum + (isNaN(row.volume) ? 0 : row.volume), 0);

    // --- Open vs. Closing Price Relationship (Creative Indicator) ---
    for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        if (!isNaN(row.openingPrice) && !isNaN(row.close)) {
            row.openToCloseChange = (row.close - row.openingPrice) / row.openingPrice;
        } else {
            row.openToCloseChange = NaN;
        }
    }

    // --- Trades vs. Volume Divergence (Creative Indicator) ---
    const averageTrades = processedData.reduce((sum, row) => sum + (isNaN(row.trades) ? 0 : row.trades), 0) / processedData.length;
    const averageVolume = processedData.reduce((sum, row) => sum + (isNaN(row.volume) ? 0 : row.volume), 0) / processedData.length;

    for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        const tradesRatio = row.trades / averageTrades;
        const volumeRatio = row.volume / averageVolume;

        if (!isNaN(tradesRatio) && !isNaN(volumeRatio)) {
            if (tradesRatio > 1.5 && volumeRatio < 0.5) {
                row.tradesVolumeDivergence = "High Trades/Low Volume";
            } else if (tradesRatio < 0.5 && volumeRatio > 1.5) {
                row.tradesVolumeDivergence = "Low Trades/High Volume";
            } else {
                row.tradesVolumeDivergence = "Normal";
            }
        } else {
            row.tradesVolumeDivergence = "Unknown";
        }
    }

    // --- Outlier Stocks (Creative Indicator) ---
    const priceChanges = processedData.map(row => Math.abs(row.change)).filter(change => !isNaN(change));
    const volumeChanges = processedData.map(row => Math.abs(row.volume)).filter(volume => !isNaN(volume));

    const medianPriceChange = getMedian(priceChanges);
    const medianVolumeChange = getMedian(volumeChanges);

    const priceChangeThreshold = medianPriceChange * 3;
    const volumeChangeThreshold = medianVolumeChange * 3;

    for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        const absPriceChange = Math.abs(row.change);
        const absVolumeChange = Math.abs(row.volume);

        if (!isNaN(absPriceChange) && absPriceChange > priceChangeThreshold) {
            row.priceOutlier = true;
        } else {
            row.priceOutlier = false;
        }

        if (!isNaN(absVolumeChange) && absVolumeChange > volumeChangeThreshold) {
            row.volumeOutlier = true;
        } else {
            row.volumeOutlier = false;
        }
    }

    // --- Volume Increase with No Price Change ---
    const averageVolumeForNoChange = processedData.reduce((sum, row) => sum + (isNaN(row.volume) ? 0 : row.volume), 0) / processedData.length;

    for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];

        if (!isNaN(row.volume) && !isNaN(row.change)) {
            const volumeIncreaseFactor = row.volume / averageVolumeForNoChange;

            if (Math.abs(row.change) < 0.01 && volumeIncreaseFactor > 2) {
                row.volumeIncreaseNoChange = true;
            } else {
                row.volumeIncreaseNoChange = false;
            }
        } else {
            row.volumeIncreaseNoChange = false;
        }
    }


    // --- Add calculated metrics to the data ---
    processedData.overallSentiment = overallSentiment;
    processedData.totalVolume = totalVolume;


    return processedData;
}

function getMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}