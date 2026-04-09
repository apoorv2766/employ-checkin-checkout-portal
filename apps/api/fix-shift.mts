import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('MONGODB_URI not set');

await mongoose.connect(uri);
const result = await mongoose.connection.collection('shifts').updateMany(
  {},
  { $set: { startTime: '00:00', endTime: '23:59', workingDays: [0,1,2,3,4,5,6], gracePeriodMinutes: 0 } }
);
console.log('Updated shifts:', result.modifiedCount);
await mongoose.disconnect();
