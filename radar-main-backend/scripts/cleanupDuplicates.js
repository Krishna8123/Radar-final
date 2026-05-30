const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error('Error: MONGO_URI is not defined in your environment/dotenv file.');
    process.exit(1);
}

async function run() {
    console.log(`Connecting to MongoDB at: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('Successfully connected to MongoDB.');

    const OHLC = require('../src/models/OHLC');

    console.log('Scanning for duplicates in the OHLC collection...');
    
    const duplicates = await OHLC.aggregate([
        {
            $group: {
                _id: {
                    symbol: '$symbol',
                    exchange: '$exchange',
                    timeframe: '$timeframe',
                    timestamp: '$timestamp'
                },
                count: { $sum: 1 },
                docs: { $push: '$_id' }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);

    console.log(`Found ${duplicates.length} duplicate candle groups.`);

    if (duplicates.length === 0) {
        console.log('No duplicates found. Database is already clean.');
        await mongoose.disconnect();
        return;
    }

    let totalDeleted = 0;
    for (let i = 0; i < duplicates.length; i++) {
        const group = duplicates[i];
        // Keep the first document, delete the remaining duplicates
        const toDelete = group.docs.slice(1);
        const res = await OHLC.deleteMany({ _id: { $in: toDelete } });
        totalDeleted += res.deletedCount;
        
        if ((i + 1) % 100 === 0 || i === duplicates.length - 1) {
            console.log(`Processed ${i + 1}/${duplicates.length} duplicate groups...`);
        }
    }

    console.log(`Cleanup complete! Successfully deleted ${totalDeleted} duplicate documents.`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
}

run().catch(err => {
    console.error('Error running cleanup:', err);
    process.exit(1);
});
