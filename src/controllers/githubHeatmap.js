import fetch from "node-fetch";
import GitHubHeatmap from "../models/GitHubHeatmap.js";
import User from "../models/User.js";

const fetchFromGitHubAPI = async (username, from, to, token) => {
  const query = `
      query ($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  color
                }
              }
            }
          }
        }
      }
    `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: from,
        to: to,
      },
    }),
  });

  const data = await response.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  if (!data.data?.user) throw new Error("User not found");

  return data.data.user.contributionsCollection.contributionCalendar;
};

const fetchGitHubYears = async (username, token) => {
  const yearQuery = `
        query ($login: String!) {
          user(login: $login) {
            createdAt
            contributionsCollection {
                contributionYears
            }
          }
        }
      `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: yearQuery,
      variables: { login: username },
    }),
  });

  const data = await response.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  if (!data.data?.user) throw new Error("User not found");

  let years = data.data.user.contributionsCollection?.contributionYears || [];
  if (years.length === 0) {
    const createdYear = new Date(data.data.user.createdAt).getFullYear();
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= createdYear; y--) {
      years.push(y);
    }
  }
  return years;
};

export const fetchGitHubHeatmap = async (req, res) => {
  try {
    const { username, from, to, fetchYears, refresh } = req.body;

    if (!username) {
      return res.status(400).json({ error: "GitHub username is required" });
    }

    // Try to link to User
    const user = await User.findOne({ githubUsername: username });
    const token = process.env.GITHUB_TOKEN || process.env.GIHUB_HITMAP_TOKEN;

    // HANDLE YEARS REQUEST
    if (fetchYears) {
      // Check DB first
      if (!refresh && user) {
        const cached = await GitHubHeatmap.findOne({ userId: user._id });
        if (cached && cached.activeYears && cached.activeYears.length > 0) {
          return res.json({ years: cached.activeYears });
        }
      }

      // Fetch from API
      try {
        const years = await fetchGitHubYears(username, token);

        // Update DB only if user exists and we have full data? 
        // We might just update the activeYears array in a "partial" update or wait for full fetch?
        // Let's safe-update if doc exists, or create new.
        if (user) {
          await GitHubHeatmap.findOneAndUpdate(
            { userId: user._id },
            {
              $set: {
                username: username,
                activeYears: years,
                lastUpdated: new Date()
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }

        return res.json({ years });
      } catch (err) {
        console.error("Error fetching GitHub years:", err);
        return res.status(500).json({ error: "Failed to fetch years" });
      }
    }

    // HANDLE HEATMAP DATA REQUEST
    // Calculate Year from 'from' date or current year
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const targetYear = fromDate.getFullYear();
    const yearKey = targetYear.toString();

    // Check DB
    if (!refresh && user) {
      const cached = await GitHubHeatmap.findOne({ userId: user._id });
      if (cached && cached.years && cached.years.has(yearKey)) {
        const yearData = cached.years.get(yearKey);
        // Return cached data
        return res.json({
          totalContributions: yearData.totalContributions,
          weeks: yearData.weeks
        });
      }
    }

    // Fetch from API
    const now = new Date();
    const apiFrom = from || `${targetYear}-01-01T00:00:00Z`;
    const apiTo = to || `${targetYear}-12-31T23:59:59Z`;

    const calendar = await fetchFromGitHubAPI(username, apiFrom, apiTo, token);

    // Update DB
    if (user) {
      const updateData = {
        [`years.${yearKey}`]: {
          year: targetYear,
          totalContributions: calendar.totalContributions,
          weeks: calendar.weeks
        },
        lastUpdated: new Date()
      };

      await GitHubHeatmap.findOneAndUpdate(
        { userId: user._id },
        {
          $set: { username: username, ...updateData }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks,
    });

  } catch (error) {
    console.error("Error fetching GitHub heatmap:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
