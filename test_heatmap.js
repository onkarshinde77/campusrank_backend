import buildHeatmap from './src/utils/heatmap.js';

const result = buildHeatmap({}, 2025);
console.log('First 4 weeks of 2025:');
result.weeks.slice(0, 4).forEach((week, i) => {
    const dayRow = week.map(d => d ? d.date.slice(-2) : '--').join(' ');
    console.log(`Week ${i}: ${dayRow}`);
});

console.log('\nJan 1, 2025 day of week:', new Date(2025, 0, 1).toLocaleString('en-US', { weekday: 'long' }));
console.log('Total weeks in heatmap:', result.weeks.length);
