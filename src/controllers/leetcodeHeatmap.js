import fetch from "node-fetch";

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
 * STEP 2: Fetch submissionCalendar for ONE year
 */
async function fetchCalendarByYear(username, year) {
  const query = `
    query UserCalendarByYear($username: String!, $year: Int!) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          submissionCalendar
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
  return (
    json?.data?.matchedUser?.userCalendar?.submissionCalendar || "{}"
  );
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
    const calendarStr = await fetchCalendarByYear(username, year);
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
