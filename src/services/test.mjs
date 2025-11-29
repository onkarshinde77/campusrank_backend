import axios from "axios";
import * as cheerio from "cheerio";

// 🔹 Change username here
const username = "vedantshetti";

// 🧩 Fetch PR statistics for all repositories
async function getPullRequestStats(username) {
  let totalPRs = 0, open = 0, closed = 0, merged = 0;

  try {
    const reposUrl = `https://api.github.com/users/${username}/repos?per_page=100`;
    const { data: repos } = await axios.get(reposUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    for (const repo of repos) {
      const pullsUrl = `https://api.github.com/repos/${username}/${repo.name}/pulls?state=all&per_page=100`;
      const { data: pulls } = await axios.get(pullsUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      totalPRs += pulls.length;

      for (const pr of pulls) {
        if (pr.state === "open") open++;
        else if (pr.state === "closed") {
          const { data: prDetails } = await axios.get(pr.url, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (prDetails.merged_at) merged++;
          else closed++;
        }
      }
    }

    return { totalPRs, open, closed, merged };
  } catch (err) {
    console.error("❌ Error fetching PR stats:", err.message);
    return { totalPRs: 0, open: 0, closed: 0, merged: 0 };
  }
}

// 🧩 Fetch basic profile stats (repos + followers)
async function getProfileStats(username) {
  const url = `https://github.com/${username}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const $ = cheerio.load(data);

    const repoCount = $('a[href$="?tab=repositories"] .Counter')
      .first()
      .text()
      .trim() || "0";

    const followerCount = $('a[href$="?tab=followers"] .text-bold')
      .first()
      .text()
      .trim() || "0";

    return { repoCount, followerCount };
  } catch (err) {
    console.error("❌ Error fetching profile stats:", err.message);
    return { repoCount: "0", followerCount: "0" };
  }
}

// 🧩 Combine both stats and show all in one table
(async () => {
  console.log(`🔍 Fetching GitHub stats for ${username}...`);

  const [prStats, profileStats] = await Promise.all([
    getPullRequestStats(username),
    getProfileStats(username),
  ]);

  const finalStats = {
    Username: username,
    "Total Repositories": profileStats.repoCount,
    Followers: profileStats.followerCount,
    "Total PRs": prStats.totalPRs,
    "Open PRs": prStats.open,
    "Closed PRs": prStats.closed,
    "Merged PRs": prStats.merged,
  };

  console.table(finalStats);
})();
