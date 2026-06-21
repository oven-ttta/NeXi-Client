document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();

    document.getElementById('clearBtn').addEventListener('click', async () => {
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลสถิติทั้งหมด?')) {
            await window.NexiDb.clearStats();
            await loadStats();
        }
    });
});

async function loadStats() {
    try {
        const data = await window.NexiDb.getAllStats();
        const summary = data.summary;
        const matches = data.matches;

        // Update Summary Cards
        document.getElementById('totalKills').innerText = summary.totalKills.toLocaleString();
        document.getElementById('totalDeaths').innerText = summary.totalDeaths.toLocaleString();
        document.getElementById('kdRatio').innerText = summary.kdRatio;
        document.getElementById('totalScore').innerText = summary.totalScore.toLocaleString();

        // Update Match History Table
        const tbody = document.getElementById('matchTableBody');
        tbody.innerHTML = '';

        if (matches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #8e95b3;">ยังไม่มีประวัติการแข่ง</td></tr>';
            return;
        }

        matches.forEach(match => {
            const tr = document.createElement('tr');
            
            const date = new Date(match.date);
            const dateStr = `${date.toLocaleDateString('th-TH')} ${date.toLocaleTimeString('th-TH')}`;
            
            const resultClass = match.result === 'Victory' ? 'result-victory' : 'result-defeat';
            const resultText = match.result === 'Victory' ? 'ชนะ' : 'แพ้';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td class="${resultClass}">${resultText}</td>
                <td>${match.kills || 0}</td>
                <td>${match.deaths || 0}</td>
                <td>${match.assist || 0}</td>
                <td>${match.headshot || 0}</td>
                <td>${(match.score || 0).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}
