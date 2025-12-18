import buildHeatmap from './src/utils/heatmap.js';

const result = buildHeatmap({}, 2025);
console.log('First 4 weeks of 2025:');
result.weeks.slice(0, 4).forEach((week, i) => {
    const dayRow = week.map(d => d ? d.date.slice(-2) : '--').join(' ');
    console.log(`Week ${i}: ${dayRow}`);
});

console.log('\nJan 1, 2025 day of week:', new Date(2025, 0, 1).toLocaleString('en-US', { weekday: 'long' }));
console.log('Total weeks in heatmap:', result.weeks.length);

// Count days per month
const counts = new Array(12).fill(0);
result.weeks.forEach(week => {
    week.forEach(d => {
        if (d && d.date) {
            const m = new Date(d.date).getUTCMonth();
            counts[m]++;
        }
    });
});

console.log('Days per month (should match 31/28/30 pattern):', counts.map((c, i) => `${i + 1}:${c}`).join(' '));
// Show monthPositions and which weeks will show month label per frontend logic
console.log('\nMonth positions (month:week):', result.monthPositions || result.heatmap?.monthPositions || {});
const mp = result.monthPositions || result.heatmap?.monthPositions || {};
const labelWeeks = result.weeks.map((w, wi) => ({ wi, label: Object.values(mp).includes(wi) ? (new Date((w.find(d => d) || {}).date || `${2025}-01-01`).getUTCMonth() + 1) : '' }));
console.log('Weeks with label (week:monthIndex):');
labelWeeks.forEach(l => { if (l.label) console.log(`week ${l.wi}: month ${l.label}`); });
