const YahooFinance = require('yahoo-finance2').default;

async function test() {
    console.log("Testing Yahoo Finance for TCS.NS 15m 5d...");
    try {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 5);
        
        const result = await YahooFinance.chart('TCS.NS', {
            period1: from,
            period2: to,
            interval: '15m'
        });
        
        console.log("Success! Candles count:", result.quotes.length);
        console.log("First candle:", result.quotes[0]);
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}
test();