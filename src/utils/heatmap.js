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

    const months = [];
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let m = 0; m < 12; m++) {
        const firstDay = new Date(Date.UTC(targetYear, m, 1));
        const lastDay = new Date(Date.UTC(targetYear, m + 1, 0));
        const weeks = [];

        let currentWeek = new Array(7).fill(null);

        // Iterate through all days of the month
        for (let d = 1; d <= lastDay.getUTCDate(); d++) {
            const date = new Date(Date.UTC(targetYear, m, d));
            const dateStr = date.toISOString().slice(0, 10);
            const dow = date.getUTCDay(); // 0 is Sunday, 6 is Saturday

            currentWeek[dow] = {
                date: dateStr,
                count: byDate[dateStr] || 0
            };

            // If it's Saturday or the last day of the month, push the week
            if (dow === 6 || d === lastDay.getUTCDate()) {
                weeks.push(currentWeek);
                currentWeek = new Array(7).fill(null);
            }
        }

        months.push({
            name: MONTH_NAMES[m],
            weeks: weeks
        });
    }

    return { months };
}
