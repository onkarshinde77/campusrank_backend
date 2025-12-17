export default function buildHeatmapFromCalendar(submissionCalendarData, year) {
    // Parse submission calendar if it's a string
    let submissionCalendar = {};

    if (typeof submissionCalendarData === 'string') {
        try {
            submissionCalendar = JSON.parse(submissionCalendarData);
        } catch (e) {
            console.error('Failed to parse submission calendar:', e);
            submissionCalendar = {};
        }
    } else {
        submissionCalendar = submissionCalendarData || {};
    }

    // Normalize timestamps → YYYY-MM-DD
    const byDate = {};
    Object.entries(submissionCalendar).forEach(([ts, count]) => {
        try {
            const date = new Date(Number(ts) * 1000)
                .toISOString()
                .slice(0, 10);
            byDate[date] = count;
        } catch (e) {
            console.error('Failed to parse timestamp:', ts);
        }
    });

    // Use provided year or current year
    const targetYear = year || new Date().getUTCFullYear();
    const start = new Date(Date.UTC(targetYear, 0, 1));
    const end = new Date(Date.UTC(targetYear, 11, 31));

    const weeks = [];
    let week = new Array(7).fill(null);

    // Start from the Sunday of the week containing Jan 1
    let cursor = new Date(start);
    let dayIndex = cursor.getUTCDay();

    // Fill in empty slots before Jan 1 if it doesn't start on Sunday
    // This is done by starting cursor at the previous Sunday

    // Iterate through the entire year
    const yearStart = new Date(Date.UTC(targetYear, 0, 1));
    let loopCursor = new Date(yearStart);
    loopCursor.setUTCDate(loopCursor.getUTCDate() - loopCursor.getUTCDay()); // Go to Sunday of this week

    let loopDayIndex = 0;
    let loopWeek = new Array(7).fill(null);

    // Continue until we've processed the entire year and completed the last week
    while (loopCursor.getUTCFullYear() < targetYear || loopCursor.getUTCMonth() < 11 || loopCursor.getUTCDate() <= 31) {
        const key = loopCursor.toISOString().slice(0, 10);
        const cursorYear = loopCursor.getUTCFullYear();

        // Only add data if it's in the target year
        if (cursorYear === targetYear) {
            loopWeek[loopDayIndex] = {
                date: key,
                count: byDate[key] || 0
            };
        }

        loopDayIndex++;
        loopCursor.setUTCDate(loopCursor.getUTCDate() + 1);

        if (loopDayIndex === 7) {
            weeks.push(loopWeek);
            loopWeek = new Array(7).fill(null);
            loopDayIndex = 0;
        }

        // Safety check to prevent infinite loop
        if (cursorYear > targetYear) break;
    }

    if (loopWeek.some(Boolean)) weeks.push(loopWeek);

    // Month label positions
    const monthPositions = {};
    weeks.forEach((w, wi) => {
        w.forEach(d => {
            if (!d) return;
            const m = new Date(d.date).getUTCMonth();
            if (new Date(d.date).getUTCDate() === 1 && monthPositions[m] == null) {
                monthPositions[m] = wi;
            }
        });
    });

    return { weeks, monthPositions };
}
