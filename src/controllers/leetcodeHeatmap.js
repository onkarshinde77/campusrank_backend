import fetch from "node-fetch";
import buildHeatmapFromCalendar from '../utils/heatmap.js';
import LeetCodeHeatmap from '../models/LeetCodeHeatmap.js';
import User from '../models/User.js';

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
 * Fetch all years data from LeetCode API
 */
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

/**
 * Main Controller Function
 * Handles cached DB check + API fallback/update
 */
export const getLeetCodeHeatmap = async (req, res) => {
  try {
    const { username, year, refresh } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Attempt to find user to link (Foreign Key)
    // We try to find by leetcodeId (username)
    let user = await User.findOne({ leetcodeId: username });

    // If not found, maybe look by generic search or fail?
    // The user requirement said "used USER id or any another foreign key".
    // If we can't find a User, we can't store with userId.
    if (!user) {
      // Fallback: If no user found in DB, we can't save to DB with userId.
      // We could just return API data without saving, or error.
      // Assuming we should return data for unregistered users too (public profile feature?):
      // But the requirement implies saving to database.
      // Let's assume we proceed but maybe without DB update if user strictly doesn't exist?
      // Or we require the User to exist.
      // Given this is "CampusRank", likely all students are Users.
      // Check if username is actually a user ID? No, it's leetcode handle.
      // We'll proceed with API fetch if user missing, but skip saving.
      // OR better: Assume user exists.
      console.warn(`User with leetcodeId ${username} not found in DB. Searching by name/other fields?`);
    }

    // 1. Check DB for cached data if not refreshing
    if (!refresh && user) {
      const cached = await LeetCodeHeatmap.findOne({ userId: user._id });
      if (cached) {
        console.log(`Using cached LeetCode data for ${username}`);
        // Return cached data formatted
        return returnFormattedData(res, cached, year, username);
      }
    }

    // 2. Fetch from API
    console.log(`Fetching LeetCode data from API for ${username}`);
    const apiData = await fetchLeetCodeAllYearsData(username);

    // 3. Save to DB (if user exists)
    if (user) {
      // Upsert
      let heatmapDoc = await LeetCodeHeatmap.findOne({ userId: user._id });
      if (!heatmapDoc) {
        heatmapDoc = new LeetCodeHeatmap({
          userId: user._id,
          username: username
        });
      }

      // Update fields
      heatmapDoc.username = username; // Ensure sync
      heatmapDoc.activeYears = apiData.activeYears;
      heatmapDoc.totalActiveDays = apiData.totalActiveDays;
      heatmapDoc.totalSubmissions = apiData.totalSubmissions;
      heatmapDoc.maxStreak = apiData.maxStreak;

      // Update map
      // We need to convert objects to Map acceptable format or just set it
      // Mongoose Map expects object with keys
      heatmapDoc.years = apiData.years;

      heatmapDoc.lastUpdated = new Date();
      await heatmapDoc.save();

      // Return formatted from the saved doc (to ensure consistency)
      return returnFormattedData(res, heatmapDoc, year, username);
    } else {
      // Just return API data directly formatted
      // We need to mock the doc structure roughly
      return returnFormattedData(res, { ...apiData, years: new Map(Object.entries(apiData.years)) }, year, username);
    }

  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch heatmap' });
  }
};

// Helper to format response matches existing frontend expectation
function returnFormattedData(res, data, year, username) {
  // Current frontend expects:
  // { years: [], streak: {}, totalActiveDays: 0, heatmap: { months: ... } }

  // Determine target year
  const activeYears = data.activeYears || [];
  const targetYear = year || (activeYears.length > 0 ? activeYears[0] : new Date().getFullYear());

  // Get year data from Map (key is 'y2024') or direct object
  const yearKey = `y${targetYear}`;
  let yearData = null;

  if (data.years instanceof Map) {
    yearData = data.years.get(yearKey);
  } else {
    yearData = data.years[yearKey];
  }

  // If year not found, return empty
  if (!yearData) {
    return res.json({
      years: activeYears,
      streak: { max: data.maxStreak || 0 }, // Overall streak? Or year streak? Frontend expects 'streak' object? 
      // Looking at leetcodeHeatmap.jsx: data.streak?.max
      // backend sent: streak: streak (which was { current, max } from buildHeatmap)
      totalActiveDays: data.totalActiveDays, // Total or Year? Frontend labels it "Total active days". Usually year specific?
      // Existing controller leetcodeHeatmap logic: 
      // const { months, totalActiveDays, streak } = buildHeatmapFromCalendar(...) for SPECIFIC YEAR.
      // So totalActiveDays was specific to the year.
      heatmap: { months: [] }
    });
  }

  // We need to rebuild the heatmap months/weeks for the specific year from submissionCalendar
  const calendarStr = yearData.submissionCalendar;
  let calendarObj = {};
  try {
    calendarObj = typeof calendarStr === 'string' ? JSON.parse(calendarStr) : calendarStr;
  } catch (e) { calendarObj = {}; }

  const { months, totalActiveDays: yearTotalActiveDays, streak: yearStreak } = buildHeatmapFromCalendar(
    calendarObj,
    targetYear
  );

  res.json({
    years: activeYears,
    streak: yearStreak,
    totalActiveDays: yearTotalActiveDays,
    heatmap: { months },
    totalSubmissions: yearData.totalSubmissions // Bonus info
  });
}
