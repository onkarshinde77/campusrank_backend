import fetch from "node-fetch";

export default async function fetchLeetCodeCalendars(username) {
  const query = `
    query UserCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar {
          activeYears
        }
        calendars: userCalendar {
          submissionCalendar
          streak
          totalActiveDays
        }
      }
    }
  `;

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Referer": "https://leetcode.com",
      "Cookie": process.env.LEETCODE_COOKIE || "",
      "x-csrftoken": process.env.CSRF_TOKEN || ""
    },
    body: JSON.stringify({
      query,
      variables: { username }
    })
  });

  const json = await res.json();
  console.log("LeetCode calendar response:", json);

  if (!json?.data?.matchedUser) {
    throw new Error("Invalid LeetCode response or user not found");
  }

  const userData = json.data.matchedUser;

  return {
    activeYears: userData.userCalendar?.activeYears || [],
    submissionCalendar: userData.calendars?.submissionCalendar || "{}",
    streak: userData.calendars?.streak || { current: 0, max: 0 },
    totalActiveDays: userData.calendars?.totalActiveDays || 0
  };
}

