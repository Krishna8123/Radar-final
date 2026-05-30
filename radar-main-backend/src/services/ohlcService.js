const OHLC = require('../models/OHLC');
const logger = require('../config/logger');



class OHLCService {
    
    _normalizeOHLCEntry(item) {
        if (!item) return null;
        let symbol = String(item.symbol || '').toUpperCase().trim();
        if (!symbol) return null;
        symbol = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, '');

        let exchange = String(item.exchange || '').toUpperCase().trim();
        const validExchanges = ['NSE', 'BSE', 'NYSE', 'NASDAQ', 'CRYPTO', 'FOREX'];
        if (!validExchanges.includes(exchange)) {
            const symUpper = String(item.symbol || '').toUpperCase();
            if (symUpper.endsWith('.BO') || symUpper.endsWith('.BSE')) {
                exchange = 'BSE';
            } else if (symUpper.endsWith('-USD') || ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'SOL-USD', 'BTC-USD', 'ETH-USD'].includes(symbol)) {
                exchange = 'CRYPTO';
            } else if (symUpper.endsWith('.US') || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'].includes(symbol)) {
                exchange = 'NASDAQ';
            } else {
                exchange = 'NSE';
            }
        }

        let timeframe = String(item.timeframe || '1d').trim();
        const tfLower = timeframe.toLowerCase();
        if (['1d', 'daily'].includes(tfLower)) timeframe = '1d';
        else if (['1w', 'weekly'].includes(tfLower)) timeframe = '1w';
        else if (['1m', '1mo', 'monthly'].includes(tfLower)) timeframe = '1M';
        else if (['1min'].includes(tfLower)) timeframe = '1m';
        else if (['5m', '5min'].includes(tfLower)) timeframe = '5m';
        else if (['15m', '15min'].includes(tfLower)) timeframe = '15m';
        else if (['1h', '60min', '60m'].includes(tfLower)) timeframe = '1h';
        else if (['4h'].includes(tfLower)) timeframe = '4h';
        else {
            timeframe = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'].includes(timeframe) ? timeframe : '1d';
        }

        let timestampVal = item.timestamp || item.datetime || item.date || item.time;
        if (!timestampVal) return null;
        if (typeof timestampVal === 'number' && timestampVal < 1000000000000) {
            timestampVal = timestampVal * 1000;
        }
        let timestamp = new Date(timestampVal);
        if (isNaN(timestamp.getTime())) return null;

        if (timeframe === '1d') {
            timestamp = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 0, 0, 0, 0));
        }

        const open = Number(item.open);
        const high = Number(item.high);
        const low = Number(item.low);
        const close = Number(item.close);
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return null;

        let source = String(item.source || 'yahoo').toLowerCase().trim();
        const validSources = ['yahoo', 'nse', 'twelvedata', 'alphavantage', 'manual'];
        if (!validSources.includes(source)) {
            source = 'yahoo';
        }

        return {
            timestamp,
            symbol,
            exchange,
            timeframe,
            open,
            high,
            low,
            close,
            volume: Number(item.volume || 0),
            adjustedClose: item.adjustedClose != null ? Number(item.adjustedClose) : undefined,
            source
        };
    }

    async bulkInsertOHLC(dataArray) {
        try {
            if (!Array.isArray(dataArray) || dataArray.length === 0) {
                return { success: false, message: 'No data provided' };
            }

            const cleanedData = [];
            const invalidRecords = [];

            for (const item of dataArray) {
                const cleaned = this._normalizeOHLCEntry(item);
                if (cleaned) {
                    cleanedData.push(cleaned);
                } else {
                    invalidRecords.push(item);
                }
            }

            if (invalidRecords.length > 0) {
                logger.warn(`[OHLC bulkInsert] Skipped ${invalidRecords.length} records due to validation/timestamp failure. Examples: ${JSON.stringify(invalidRecords.slice(0, 3))}`);
            }

            if (cleanedData.length === 0) {
                return { success: false, message: 'No valid data after cleaning' };
            }

            const newDocs = [];
            const groups = {};
            for (const item of cleanedData) {
                const key = `${item.symbol}:${item.exchange}:${item.timeframe}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            }

            for (const key of Object.keys(groups)) {
                const groupItems = groups[key];
                const [symbol, exchange, timeframe] = key.split(':');
                
                const timestamps = groupItems.map(item => item.timestamp);
                const minDate = new Date(Math.min(...timestamps.map(t => t.getTime())));
                const maxDate = new Date(Math.max(...timestamps.map(t => t.getTime())));

                const existingDocs = await OHLC.find({
                    symbol,
                    exchange,
                    timeframe,
                    timestamp: { $gte: minDate, $lte: maxDate }
                }).select('timestamp').lean();

                const existingTimes = new Set(existingDocs.map(d => new Date(d.timestamp).getTime()));

                for (const item of groupItems) {
                    if (!existingTimes.has(item.timestamp.getTime())) {
                        newDocs.push(item);
                        existingTimes.add(item.timestamp.getTime());
                    }
                }
            }

            if (newDocs.length === 0) {
                return {
                    success: true,
                    count: 0,
                    message: 'All records already exist, skipped duplicates',
                };
            }

            const result = await OHLC.insertMany(newDocs, { ordered: false });
            logger.info(`✅ Bulk Inserted ${result.length} new OHLC records (skipped ${cleanedData.length - result.length} duplicates)`);
            
            return {
                success: true,
                count: result.length,
                message: `Successfully inserted ${result.length} new records, skipped duplicates`,
            };
        } catch (error) {
            logger.error(`Error inserting OHLC data: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }

    
    async getOHLCData({
        symbol,
        exchange = 'NSE',
        timeframe = '1d',
        startDate = null,
        endDate = null,
        limit = 365,
    }) {
        try {
            const query = {
                symbol: symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, ''),
                exchange: exchange.toUpperCase(),
                timeframe,
            };

            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const data = await OHLC.find(query)
                .sort({ timestamp: -1 }) // Most recent first
                .limit(limit)
                .lean();

            logger.info(`Retrieved ${data.length} OHLC records for ${symbol}`);

            return {
                success: true,
                count: data.length,
                data: data.reverse(), // Return oldest first
            };
        } catch (error) {
            logger.error(`Error retrieving OHLC data: ${error.message}`);
            return {
                success: false,
                message: error.message,
                data: [],
            };
        }
    }

    
    async getLatestOHLC(symbol, exchange = 'NSE', timeframe = '1d') {
        try {
            const data = await OHLC.findOne({
                symbol: symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, ''),
                exchange: exchange.toUpperCase(),
                timeframe,
            })
                .sort({ timestamp: -1 })
                .lean();

            return {
                success: true,
                data,
            };
        } catch (error) {
            logger.error(`Error retrieving latest OHLC: ${error.message}`);
            return {
                success: false,
                data: null,
            };
        }
    }

    
    async getLatest(symbol, timeframe = '1d', exchange = 'NSE') {
        return this.getLatestOHLC(symbol, exchange, timeframe);
    }

    
    async saveOHLC(ohlcData) {
        try {
            const cleaned = this._normalizeOHLCEntry(ohlcData);
            if (!cleaned) {
                return {
                    success: false,
                    message: 'Invalid data for OHLC save',
                };
            }

            // Check if exists
            const exists = await OHLC.findOne({
                symbol: cleaned.symbol,
                exchange: cleaned.exchange,
                timeframe: cleaned.timeframe,
                timestamp: cleaned.timestamp
            }).select('_id').lean();

            if (exists) {
                return {
                    success: true,
                    message: 'Record already exists',
                };
            }

            const record = new OHLC(cleaned);
            await record.save();
            
            return {
                success: true,
                data: record,
            };
        } catch (error) {
            logger.error(`Error saving OHLC record: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }

    
    async hasData(symbol, exchange, timeframe, startDate, endDate) {
        try {
            const count = await OHLC.countDocuments({
                symbol: symbol.toUpperCase(),
                exchange: exchange.toUpperCase(),
                timeframe,
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
            });

            return count > 0;
        } catch (error) {
            logger.error(`Error checking OHLC data existence: ${error.message}`);
            return false;
        }
    }

    
    async deleteOldData(daysOld = 365) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await OHLC.deleteMany({
                timestamp: { $lt: cutoffDate },
            });

            logger.info(`Deleted ${result.deletedCount} old OHLC records`);

            return {
                success: true,
                deletedCount: result.deletedCount,
            };
        } catch (error) {
            logger.error(`Error deleting old OHLC data: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }

    
    async getAvailableSymbols(exchange = null) {
        try {
            const match = exchange ? { exchange: exchange.toUpperCase() } : {};
            
            const symbols = await OHLC.distinct('symbol', match);

            return {
                success: true,
                count: symbols.length,
                symbols,
            };
        } catch (error) {
            logger.error(`Error getting available symbols: ${error.message}`);
            return {
                success: false,
                symbols: [],
            };
        }
    }
}

module.exports = new OHLCService();
