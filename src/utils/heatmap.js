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

    let totalActiveDays = 0;
    let maxStreak = 0;
    let currentStreakCount = 0;
    let isCurrentYear = new Date().getUTCFullYear() === targetYear;

    // Sort all dates to ensure chronological processing for streak (though we iterate by calendar days below which is safe)
    // Actually we will iterate day by day, so we just check `byDate`.

    // We maintain a running streak counter across month boundaries
    let runningStreak = 0;

    // Check if we need to calculate "Current Streak" relative to today
    // For past years, "Current" doesn't strictly apply, usually 0. 
    // If it's the current year, we capture the run ending on "today".
    const todayStr = new Date().toISOString().slice(0, 10);

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

            const count = byDate[dateStr] || 0;

            // Stats calculation
            if (count > 0) {
                totalActiveDays++;
                runningStreak++;
            } else {
                runningStreak = 0;
            }

            if (runningStreak > maxStreak) {
                maxStreak = runningStreak;
            }

            // If this is today (and we are in current year), this IS the current streak
            if (isCurrentYear && dateStr === todayStr) {
                currentStreakCount = runningStreak;
            }

            currentWeek[dow] = {
                date: dateStr,
                count: count
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

    // Edge case: If current year, and we haven't reached "today" in the loop (e.g. today is in future?? No, we iterate full year).
    // Wait, if we iterate full year, future days have count 0. So runningStreak resets.
    // So currentStreakCount logic above is correct: it captures the streak specifically at "today". 
    // If today is not in this year (past year), currentStreakCount stays 0.

    return {
        months,
        totalActiveDays,
        streak: {
            max: maxStreak,
            current: currentStreakCount
        }
    };
}
