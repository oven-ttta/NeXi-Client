const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LocalDatabase {
  constructor(filename = 'nexi_stats_db.json') {
    // Save inside Electron's standard user data folder
    this.filepath = path.join(app.getPath('userData'), filename);
    this.data = { matches: [] };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filepath)) {
        const fileContent = fs.readFileSync(this.filepath, 'utf8');
        this.data = JSON.parse(fileContent);
        if (!this.data.matches) {
          this.data.matches = [];
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load local database, resetting data...", e);
      this.data = { matches: [] };
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to save local database:", e);
    }
  }

  insertMatch(match) {
    if (!this.data.matches) {
      this.data.matches = [];
    }
    // Match fields: kills, deaths, assists, headshots, score, map, mode, victory, timestamp
    this.data.matches.push({
      kills: Number(match.kills) || 0,
      deaths: Number(match.deaths) || 0,
      assists: Number(match.assists) || 0,
      headshots: Number(match.headshots) || 0,
      score: Number(match.score) || 0,
      map: match.map || 'Unknown',
      mode: match.mode || 'Unknown',
      victory: !!match.victory,
      timestamp: match.timestamp || Date.now()
    });
    this.save();
  }

  getMatches() {
    return this.data.matches || [];
  }

  clearData() {
    this.data = { matches: [] };
    this.save();
  }

  getStatsSummary() {
    const matches = this.getMatches();
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalHeadshots = 0;
    let totalScore = 0;
    let wins = 0;

    matches.forEach(m => {
      totalKills += m.kills;
      totalDeaths += m.deaths;
      totalAssists += m.assists;
      totalHeadshots += m.headshots;
      totalScore += m.score;
      if (m.victory) {
        wins++;
      }
    });

    const kdr = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
    const winRate = matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : "0.0";

    return {
      totalMatches: matches.length,
      totalKills,
      totalDeaths,
      totalAssists,
      totalHeadshots,
      totalScore,
      wins,
      losses: matches.length - wins,
      kdr,
      winRate
    };
  }
}

module.exports = LocalDatabase;
