// import fetch from "node-fetch";
import * as cheerio from 'cheerio';

// @desc    Fetch GeeksforGeeks user statistics
export const fetchGFGStats = async (gfgId) => {
  try {
    console.log(`Fetching GFG stats for: ${gfgId}`);
    
    const userURL = `https://www.geeksforgeeks.org/user/${gfgId}/`;
    const response = await fetch(userURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`GFG profile not found for ${gfgId}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract stats
    const codingScoreText = $(".scoreCard_head__nxXR8").eq(0).find(".scoreCard_head_left--score__oSi_x").text().trim();
    const problemsSolvedText = $(".scoreCard_head__nxXR8").eq(1).find(".scoreCard_head_left--score__oSi_x").text().trim();
    const contestRatingText = $(".scoreCard_head__nxXR8").eq(2).find(".scoreCard_head_left--score__oSi_x").text().trim();
    const instituteRank = $(".educationDetails_head_left_userRankContainer--text__wt81s b").text().trim();

    const currentStreakText = $(".circularProgressBar_head_mid_streakCnt__MFOF1").text().trim().split("/")[0];
    const longestStreakText = $(".circularProgressBar_head_mid_streakCnt--glbLongStreak__viuBP").text().replace("/", "").trim();

    // Problems by difficulty
    const difficultyStats = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0
    };
    
    $(".problemNavbar_head_nav--text__UaGCx").each((_, el) => {
      const text = $(el).text().trim();
      const match = text.match(/([A-Z]+)\s*\((\d+)\)/);
      if (match && difficultyStats.hasOwnProperty(match[1])) {
        difficultyStats[match[1]] = parseInt(match[2]);
      }
    });

    const stats = {
      totalSolved: parseInt(problemsSolvedText) || 0,
      easySolved: difficultyStats.EASY,
      mediumSolved: difficultyStats.MEDIUM,
      hardSolved: difficultyStats.HARD,
      codingScore: parseInt(codingScoreText) || 0,
      contestRating: parseInt(contestRatingText) || 0,
      instituteRank: instituteRank || 'N/A',
      currentStreak: parseInt(currentStreakText) || 0,
      longestStreak: parseInt(longestStreakText) || 0
    };

    console.log(`Successfully fetched GFG stats for ${gfgId}:`, stats);
    return stats;

  } catch (err) {
    console.error(`❌ Error fetching GFG stats for ${gfgId}:`, err.message);
    return null;
  }
};
