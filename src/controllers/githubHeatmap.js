import fetch from "node-fetch";

export const fetchGitHubHeatmap = async (req, res) => {
  console.log("GitHub Heatmap Controller Loaded", process.env.GIHUB_HITMAP_TOKEN);
  try {
    console.log("GitHub Heatmap Request Received:", req.body);
    const { username, from, to, fetchYears } = req.body;

    if (!username) {
      return res.status(400).json({ error: "GitHub username is required" });
    }

    const token = process.env.GITHUB_TOKEN || process.env.GIHUB_HITMAP_TOKEN;

    if (!token) {
      console.error("GITHUB_TOKEN (or GIHUB_HITMAP_TOKEN) is missing in environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // If fetchYears is true, just return the list of valid years
    if (fetchYears) {
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

      try {
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
        if (data.errors) {
          return res.status(400).json({ error: "Failed to fetch GitHub user data", details: data.errors });
        }
        if (!data.data || !data.data.user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Use contributionYears provided by GitHub if available, otherwise calculate from createdAt
        let years = data.data.user.contributionsCollection?.contributionYears || [];

        if (years.length === 0) {
          const createdYear = new Date(data.data.user.createdAt).getFullYear();
          const currentYear = new Date().getFullYear();
          for (let y = currentYear; y >= createdYear; y--) {
            years.push(y);
          }
        }

        return res.json({ years });

      } catch (err) {
        console.error("Error fetching GitHub years:", err);
        return res.status(500).json({ error: "Failed to fetch years" });
      }
    }

    // Default to current year if dates are not provided
    const now = new Date();
    const currentYear = now.getFullYear();
    const fromDate = from || `${currentYear}-01-01T00:00:00Z`;
    const toDate = to || `${currentYear}-12-31T23:59:59Z`;



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

    console.log("Fetching from GitHub GraphQL...");
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
          from: fromDate,
          to: toDate,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("GitHub API Errors:", JSON.stringify(data.errors, null, 2));
      return res.status(400).json({ error: "Failed to fetch GitHub data", details: data.errors });
    }

    // Check for root-level API errors (like Bad Credentials)
    if (data.message) {
      console.error("GitHub API Error Message:", data.message);
      return res.status(401).json({ error: `GitHub API Error: ${data.message}` });
    }

    if (!data.data || !data.data.user) {
      console.error("User not found or no data returned. Full Response:", JSON.stringify(data, null, 2));
      return res.status(404).json({ error: "User not found on GitHub" });
    }

    const calendar = data.data.user.contributionsCollection.contributionCalendar;

    res.json({
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks,
    });

  } catch (error) {
    console.error("Error fetching GitHub heatmap:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
