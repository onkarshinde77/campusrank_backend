// server/src/utils/compression.js
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Compress data
export const compressData = async (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(jsonString));
    return compressed.toString('base64');
  } catch (error) {
    console.error('Error compressing data:', error);
    throw error;
  }
};

// Decompress data
export const decompressData = async (compressedData) => {
  try {
    const buffer = Buffer.from(compressedData, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  } catch (error) {
    console.error('Error decompressing data:', error);
    throw error;
  }
};

// Check if compression is beneficial
export const shouldCompress = (data) => {
  const jsonString = JSON.stringify(data);
  // Compress if data is larger than 1KB
  return jsonString.length > 1024;
};

// Compress old statistics (older than specified days)
export const compressOldStatistics = async (StatisticsHistory, daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldStats = await StatisticsHistory.find({
      fetchedAt: { $lt: cutoffDate },
      isCompressed: { $ne: true }
    });

    console.log(`Found ${oldStats.length} statistics to compress`);

    for (const stat of oldStats) {
      try {
        const compressed = await compressData(stat.stats);
        stat.stats = compressed;
        stat.isCompressed = true;
        await stat.save();
      } catch (error) {
        console.error(`Error compressing stat ${stat._id}:`, error);
      }
    }

    console.log(`✓ Compressed ${oldStats.length} old statistics`);
    return oldStats.length;
  } catch (error) {
    console.error('Error compressing old statistics:', error);
    throw error;
  }
};

export default {
  compressData,
  decompressData,
  shouldCompress,
  compressOldStatistics
};
