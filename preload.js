const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

// Setup safe bridge function for the webpage to send match results to Electron main process
window._saveMatchStatsInternal = (stats) => {
  ipcRenderer.send('save-match-stats', stats);
};

// Wait for DOM to load, then inject client scripts and check for game engine elements
window.addEventListener('DOMContentLoaded', () => {
  try {
    const clientPath = path.join(__dirname, 'nexi-client.js');
    if (fs.existsSync(clientPath)) {
      const clientCode = fs.readFileSync(clientPath, 'utf8');

      // Create a script tag to inject overrides into the page execution context
      const script = document.createElement('script');
      script.textContent = `
        // Expose bridge helper in the page context
        window.saveMatchStats = (stats) => {
          if (typeof window._saveMatchStatsInternal === 'function') {
            window._saveMatchStatsInternal(stats);
          } else {
            console.warn("Database save helper is not available.");
          }
        };

        // Injected NeXi-Client logic
        ${clientCode}

        // Wait until all PlayCanvas game engines elements are parsed, then hook and execute tweaks
        const checkGameInterval = setInterval(() => {
          if (
            typeof pc !== 'undefined' &&
            typeof Player !== 'undefined' &&
            typeof RoomManager !== 'undefined' &&
            typeof Movement !== 'undefined' &&
            typeof Overlay !== 'undefined' &&
            typeof Result !== 'undefined'
          ) {
            clearInterval(checkGameInterval);
            console.log("NeXi-Client game hooks found! Executing customInit...");
            try {
              client();
            } catch (err) {
              console.error("Failed to run client initialization:", err);
            }
          }
        }, 150);
      `;
      document.body.appendChild(script);
    }
  } catch (err) {
    console.error("Failed to inject nexi-client.js script:", err);
  }
});
