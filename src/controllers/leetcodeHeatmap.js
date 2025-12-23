import fetch from "node-fetch";
import buildHeatmapFromCalendar from '../utils/heatmap.js';

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Referer": "https://leetcode.com",
  "User-Agent": "Mozilla/5.0"
};

/**
 * STEP 1: Fetch all active years
 */
async function fetchActiveYears(username) {
  const query = `
    query GetActiveYears($username: String!) {
      matchedUser(username: $username) {
        userCalendar {
          activeYears
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({
      query,
      variables: { username }
    })
  });

  const text = await res.text();
  if (!text.startsWith("{")) {
    throw new Error("LeetCode blocked activeYears request");
  }

  const json = JSON.parse(text);
  return json?.data?.matchedUser?.userCalendar?.activeYears || [];
}

/**
 * STEP 2: Fetch submissionCalendar and streak for ONE year
 */
async function fetchCalendarByYear(username, year) {
  const query = `
    query UserCalendarByYear($username: String!, $year: Int!) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          submissionCalendar
          streak
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({
      query,
      variables: { username, year }
    })
  });

  const text = await res.text();
  if (!text.startsWith("{")) {
    throw new Error(`LeetCode blocked calendar for year ${year}`);
  }

  const json = JSON.parse(text);
  return {
    submissionCalendar: json?.data?.matchedUser?.userCalendar?.submissionCalendar || "{}",
    streak: json?.data?.matchedUser?.userCalendar?.streak || { current: 0, longest: 0 }
  };
}

/**
 * STEP 3: MAIN FUNCTION
 * Fetch ALL years → merge into ONE submissionCalendar
 */
export default async function fetchLeetCodeHeatmap(username) {
  // 1️⃣ Get all active years automatically
  const activeYears = await fetchActiveYears(username);

  if (activeYears.length === 0) {
    throw new Error("No active years found for this user");
  }

  let mergedCalendar = {};
  let totalActiveDays = 0;

  // 2️⃣ Fetch each year's calendar and merge
  for (const year of activeYears) {
    const { submissionCalendar: calendarStr } = await fetchCalendarByYear(username, year);
    const calendarObj = JSON.parse(calendarStr);

    totalActiveDays += Object.keys(calendarObj).length;

    mergedCalendar = {
      ...mergedCalendar,
      ...calendarObj
    };
  }

  // 3️⃣ Final heatmap-ready data
  return {
    username,
    activeYears,
    totalActiveDays,
    submissionCalendar: mergedCalendar
  };
}

/**
 * Fetch all years data with submission calendars and streak
 * Returns data for each year separately (like the API response)
 */
// export  async function fetchLeetCodeAllYearsData(username) {
//   const activeYears = await fetchActiveYears(username);

//   if (activeYears.length === 0) {
//     throw new Error("No active years found for this user");
//   }

//   const yearsData = {};
//   let totalActiveDays = 0;
//   let totalSubmissions = 0;
//   let maxStreakOverall = 0;

//   // Fetch each year's calendar and streak separately
//   for (const year of activeYears) {
//     const { submissionCalendar: calendarStr, streak } = await fetchCalendarByYear(username, year);
    
//     // Parse the calendar to count active days and submissions
//     const calendarObj = JSON.parse(calendarStr);
//     const yearActiveDays = Object.keys(calendarObj).length;
    
//     // Count total submissions for this year
//     const yearSubmissions = Object.values(calendarObj).reduce((sum, count) => sum + count, 0);
//     totalSubmissions += yearSubmissions;
//     totalActiveDays += yearActiveDays;

//     // Build heatmap to calculate max streak
//     const heatmapData = buildHeatmapFromCalendar(calendarStr, year);
//     const maxStreak = heatmapData.streak?.max || 0;
//     if (maxStreak > maxStreakOverall) {
//       maxStreakOverall = maxStreak;
//     }

//     console.log(`[YEAR ${year}] Submissions: ${yearSubmissions}, ActiveDays: ${yearActiveDays}, MaxStreak: ${maxStreak}`);

//     // Store submission calendar as stringified JSON for database
//     yearsData[`y${year}`] = {
//   submissionCalendar: JSON.stringify(calendarObj),
//   streak: maxStreak,
//   totalActiveDays: yearActiveDays,
//   totalSubmissions: yearSubmissions
// };

//   }
//   return {
//     username,
//     activeYears,
//     totalActiveDays,
//     totalSubmissions,
//     maxStreak: maxStreakOverall,
//     years: yearsData
//   };
// }

export async function fetchLeetCodeAllYearsData(username) {
  const activeYears = await fetchActiveYears(username);

  if (activeYears.length === 0) {
    throw new Error("No active years found for this user");
  }

  const yearsData = {};
  let totalActiveDays = 0;
  let totalSubmissions = 0;
  let maxStreakOverall = 0;

  for (const year of activeYears) {
    const { submissionCalendar: calendarStr } =
      await fetchCalendarByYear(username, year);

    const calendarObj = JSON.parse(calendarStr);

    const yearActiveDays = Object.keys(calendarObj).length;
    const yearSubmissions = Object.values(calendarObj).reduce(
      (sum, count) => sum + count,
      0
    );

    totalActiveDays += yearActiveDays;
    totalSubmissions += yearSubmissions;

    const heatmapData = buildHeatmapFromCalendar(calendarObj, year);
    const maxStreak = heatmapData?.streak?.max || 0;

    if (maxStreak > maxStreakOverall) {
      maxStreakOverall = maxStreak;
    }

    console.log(
      `[YEAR ${year}] Submissions: ${yearSubmissions}, ActiveDays: ${yearActiveDays}, MaxStreak: ${maxStreak}`
    );

    yearsData[`y${year}`] = {
      submissionCalendar: JSON.stringify(calendarObj),
      totalActiveDays: yearActiveDays,
      totalSubmissions: yearSubmissions,
      maxStreak: maxStreak      
    };
  }

  return {
    username,
    activeYears,
    totalActiveDays,
    totalSubmissions,
    maxStreak: maxStreakOverall,
    years: yearsData
  };
}
