import axios from 'axios';
import * as cheerio from 'cheerio';

// Fetch GitHub statistics for a user
export const fetchGitHubStats = async (githubUsername) => {
  if (!githubUsername) {
    return null;
  }

  try {
    // Fetch basic profile stats using GitHub API
    const profileUrl = `https://api.github.com/users/${githubUsername}`;
    const { data: profile } = await axios.get(profileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    // Fetch repositories
    const reposUrl = `https://api.github.com/users/${githubUsername}/repos?per_page=100`;
    const { data: repos } = await axios.get(reposUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    // Calculate total stars
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    // Calculate total forks
    const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);

    // Fetch PR statistics (simplified version to avoid rate limits)
    let totalPRs = 0;
    let openPRs = 0;
    let closedPRs = 0;
    let mergedPRs = 0;

    // Only check first 10 repos to avoid rate limits
    const reposToCheck = repos.slice(0, 10);
    
    for (const repo of reposToCheck) {
      try {
        const pullsUrl = `https://api.github.com/repos/${githubUsername}/${repo.name}/pulls?state=all&per_page=100`;
        const { data: pulls } = await axios.get(pullsUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        totalPRs += pulls.length;

        for (const pr of pulls) {
          if (pr.state === 'open') {
            openPRs++;
          } else if (pr.merged_at) {
            mergedPRs++;
          } else {
            closedPRs++;
          }
        }
      } catch (err) {
        // Skip repo if error (might be private or rate limited)
        continue;
      }
    }

    const stats = {
      totalRepositories: profile.public_repos || 0,
      followers: profile.followers || 0,
      following: profile.following || 0,
      totalStars: totalStars,
      totalForks: totalForks,
      totalPRs: totalPRs,
      openPRs: openPRs,
      closedPRs: closedPRs,
      mergedPRs: mergedPRs,
      contributions: 0, // GitHub doesn't provide this via API easily
    };

    return stats;
  } catch (err) {
    console.error('Error fetching GitHub stats:', err.message);
    return null;
  }
};