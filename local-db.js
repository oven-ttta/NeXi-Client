const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LocalDatabase {
    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'match-stats.json');
        if (!fs.existsSync(this.dbPath)) {
            this.saveAll([]);
        }
    }

    getAll() {
        try {
            return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        } catch (e) {
            return [];
        }
    }

    saveAll(data) {
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }

    insertMatch(stats) {
        const matches = this.getAll();
        matches.push({ ...stats, date: Date.now() });
        this.saveAll(matches);
    }

    getMatches() {
        return this.getAll().sort((a, b) => b.date - a.date);
    }

    getStatsSummary() {
        const matches = this.getAll();
        let kills = 0, deaths = 0, score = 0;
        for (let m of matches) {
            kills += (m.kills || 0);
            deaths += (m.deaths || 0);
            score += (m.score || 0);
        }
        return {
            totalMatches: matches.length,
            totalKills: kills,
            totalDeaths: deaths,
            kdRatio: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toString(),
            totalScore: score
        };
    }

    clearData() {
        this.saveAll([]);
    }
}

module.exports = LocalDatabase;
