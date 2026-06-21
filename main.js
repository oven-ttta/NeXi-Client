require("v8-compile-cache");

const {
  app,
  shell,
  clipboard,
  dialog,
  BrowserWindow,
  screen,
  ipcMain,
} = require("electron");
const discord = require("discord-rpc");
const Store = require("electron-store");
const config = new Store();
const path = require('path');
const OS = require("os");
const fs = require('fs');
const prompt = require("electron-prompt");
const fetch = require('node-fetch');

const LocalDatabase = require('./local-db');
const db = new LocalDatabase();

// Setup database IPC channels
ipcMain.handle('save-match-stats', async (event, stats) => {
  db.insertMatch(stats);
  return true;
});

ipcMain.handle('get-db-stats', async (event) => {
  return {
    summary: db.getStatsSummary(),
    matches: db.getMatches()
  };
});

ipcMain.handle('clear-db-stats', async (event) => {
  db.clearData();
  return true;
});

if (config.get("utilities_FPS") == null) {
  config.set("utilities_FPS", true);
}
if (config.get("utilities_D3D11OND12") == null) {
  config.set("utilities_D3D11OND12", true);
}
if (config.get("utilities_RPC") == null) {
  config.set("utilities_RPC", true);
}

if (config.get("utilities_FPS")) {
  if (OS.cpus().findIndex((cpu) => cpu.model.includes("AMD")) != -1) {
    app.commandLine.appendSwitch("enable-zero-copy");
  }
  app.commandLine.appendSwitch("disable-frame-rate-limit");
}
if (config.get("utilities_D3D11OND12")) {
  app.commandLine.appendSwitch("use-angle", "d3d11ond12");
  app.commandLine.appendSwitch("enable-webgl2-compute-context");
} else {
  app.commandLine.appendSwitch("use-angle", "d3d9");
}
app.commandLine.appendSwitch("enable-quic");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("disable-gpu-vsync");
app.commandLine.appendSwitch("enable-pointer-lock-options");
app.commandLine.appendSwitch("disable-accelerated-video-decode", false);
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-quic");
app.commandLine.appendSwitch("high-dpi-support", 1);

updateSeen = 0;


function init() {
  createInitWindow("https://venge.io/?client_version=true");
  autoUpdater.checkForUpdatesAndNotify();
}
  
function createInitWindow(url) {
  if (checkURL(url) == "social") size = 0.9;
  else size = 1.1;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  var initWin = new BrowserWindow({
    width: width * size,
    height: height * size,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  initWin.loadURL(url);
  initWin.removeMenu();
  if (checkURL(url) == "social") initWin.setSimpleFullScreen(false);
  else initWin.setSimpleFullScreen(true);

  if (
    config.get("utilities_RPC") &&
    checkURL(url) != "social" &&
    checkURL(url) != "unknown"
  ) {
    DiscordRPC();
  }
  initWin.on("ready-to-show", () => {
    setTimeout(() => {
      initWin.show();
    }, 500);
  });
  function DiscordRPC() {
    var c = {
      a: "กำลังสแตนด์บาย (Idling)",
      b: "กำลังเล่นเกม (In Game)",
      c: "กำลังรับชมการแข่ง (Spectating)",
      d: "กำลังค้นหาห้องเล่น (Searching)",
      e: "อยู่ที่หน้าเมนูหลัก (In Menu)",
      f: "กำลังโหลดเข้าเกม... (Loading)",
    };
    const rpc = new discord.Client({
      transport: "ipc",
    });
    rpc.login({
      clientId: "750116161890287657",
    });
    var date = Date.now();
    rpc.once("connected", () => {
      setRPCActivity(c.f);
      setInterval(() => {
        updateDiscord();
      }, 1e3);
    });

    app.on('before-quit',() => rpc.destroy())
    
    function setRPCActivity(msg) {
      rpc.setActivity({
        largeImageKey: "verified-icon-nexi",
        largeImageText: `NeXi-Client v${app.getVersion()}`,
        startTimestamp: date,
        details: `${msg}`,
      });
    }

    function updateDiscord() {
      let url = initWin.webContents.getURL();
      let e = null;
      let determineURL = checkURL(url);
      switch (determineURL) {
        case "menu":
          e = c.e;
          break;
        case "game":
          e = c.b;
          break;
        case "spectate":
          e = c.c;
          break;
        case "searching for game":
          e = c.d;
          break;
        default:
          e = c.a;
          break;
      }

      setRPCActivity(e);
    }
  }

  const shortcut = require("electron-localshortcut");
  shortcut.register(initWin, "F1", () => {
    autoUpdater.checkForUpdatesAndNotify();
    switch (checkURL(url)) {
      case "social":
        initWin.loadURL("https://social.venge.io");
        break;
      default:
        initWin.loadURL("https://venge.io/?client_version=true");
        break;
    }
  });

  shortcut.register(initWin, "F2", () => {
    switch (checkURL(url)) {
      case "social":
        return;
      default:
        LinkBox();
        return;
    }
  });

  shortcut.register(initWin, "F3", () => {
      let currentUrl = initWin.webContents.getURL();
      if (currentUrl.includes("#")) {
        var game = currentUrl.split('#').pop();
        var inviteUrl = "https://venge.io/#"+game;
        clipboard.writeText(inviteUrl);
        initWin.webContents.executeJavaScript('pc.app.fire("Chat:Message", "NeXi-Client", "คัดลอกลิงก์เชิญห้องแล้ว!")').catch(e=>{});
      }
  })

  shortcut.register(initWin, "Alt+F4", () => {
    switch (checkURL(url)) {
      case "social":
        initWin.close();
        break;
      default:
        app.quit();
        break;
    }
  });
  shortcut.register(initWin, "Ctrl+F5", () => {
    initWin.webContents.reloadIgnoringCache();
  });
  shortcut.register(initWin, "F12", () => {
    initWin.webContents.openDevTools();
  });
  shortcut.register(initWin, "F11", () => {
    initWin.setSimpleFullScreen(!initWin.isSimpleFullScreen());
  });
  shortcut.register(initWin, "Escape", () => {
    initWin.webContents.executeJavaScript(`
                  document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
                  document.exitPointerLock();
    `);
  });
  shortcut.register(initWin, "F10", () => {
    createSettingsWindow();
  });

  let statsWin = null;
  shortcut.register(initWin, "F9", () => {
    if (statsWin) {
      if (statsWin.isFocused()) {
        statsWin.close();
      } else {
        statsWin.focus();
      }
    } else {
      statsWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: "ประวัติการแข่ง - NeXi-Client",
        icon: path.join(__dirname, "build/game.png"),
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        },
        backgroundColor: "#0d0e15",
        show: false
      });
      statsWin.loadURL(`file://${__dirname}/stats.html`);
      statsWin.removeMenu();
      statsWin.once('ready-to-show', () => {
        statsWin.show();
      });
      statsWin.on('closed', () => {
        statsWin = null;
      });
    }
  });

  initWin.on('closed', () => {
    if (statsWin) {
      statsWin.close();
    }
  });
  initWin.webContents.on("will-prevent-unload", (event) =>
    event.preventDefault()
  );
  initWin.webContents.on("dom-ready", (event) => {
    initWin.setTitle(`NeXi-Client V${app.getVersion()}`);
    // Inject nexi-client.js logic to hook into the game
    fs.readFile(path.join(__dirname, 'nexi-client.js'), 'utf-8', (err, data) => {
      if (!err) {
        initWin.webContents.executeJavaScript(data).catch(console.error);
      }
    });
    event.preventDefault();
  });
  initWin.webContents.on("new-window", (event, url) => {
    let e = checkURL(url);
    switch (e) {
      case "social":
        event.preventDefault();
        createInitWindow(url, false, 0.75, false);
        break;
      case "unknown":
        event.preventDefault();
        shell.openExternal(url);
        break;
      case "weird thing should die":
        app.relaunch();
        app.quit();
        return;
    }
  });

  function checkURL(url) {
    if (url.indexOf("social.venge.io") != -1) return "social";
    if (url.includes("venge.io") === false && url.includes("index.html") === false) return "unknown";
    try {
      let parsed = new URL(url);
      let hash = parsed.hash;
      switch (hash.length) {
        case 0:
          return "menu";
        case 1:
          return "searching for game";
        case 6:
          return "game";
        case 15:
          return "spectate";
        default:
          return "weird thing should die";
      }
    } catch (e) {
      url = url.split("/");
      let newURL = url[url.length - 1];
      let path = newURL.includes("index.html") ? newURL.substring("index.html".length) : newURL;
      let hashIndex = path.indexOf("#");
      let hash = hashIndex !== -1 ? path.substring(hashIndex) : "";
      switch (hash.length) {
        case 0:
          return "menu";
        case 1:
          return "searching for game";
        case 6:
          return "game";
        case 15:
          return "spectate";
        default:
          return "weird thing should die";
      }
    }
  }

  function createSettingsWindow() {
    const settings = dialog.showMessageBoxSync(initWin, {
      type: "question",
      buttons: ["ทั่วไป"],
      title: "ตั้งค่า",
      message: "",
      defaultId: 0,
      cancelId: 2,
    });
    if (settings === 0) {
      openGeneralSettings();
    }

    function openGeneralSettings() {
      var fpsOption = config.get("utilities_FPS", true) ? "จำกัดเฟรมเรต (Limit FPS)" : "ปลดล็อกเฟรมเรต (Unlock FPS)";
      var d3dOption = config.get("utilities_D3D11OND12", true) ? "ปิดใช้ D3D11OND12 (Disable)" : "เปิดใช้ D3D11OND12 (Enable)";
      var rpcOption = config.get("utilities_RPC", true) ? "ปิดใช้งาน Discord RPC (Disable)" : "เปิดใช้งาน Discord RPC (Enable)";

      const options = dialog.showMessageBoxSync(initWin, {
        type: "question",
        buttons: [
          fpsOption,
          d3dOption,
          rpcOption,
        ],
        title: "การตั้งค่าทั่วไป",
        message: "",
        defaultId: 0,
        cancelId: 3,
      });

      if (options === 0) {
        if (config.get("utilities_FPS", true)) {
          config.set("utilities_FPS", false);
        } else {
          config.set("utilities_FPS", true);
        }
        app.relaunch();
        app.quit();
      }
      if (options === 1) {
        if (config.get("utilities_D3D11OND12", true)) {
          config.set("utilities_D3D11OND12", false);
        } else {
          config.set("utilities_D3D11OND12", true);
        }
        app.relaunch();
        app.quit();
      }
      if (options === 2) {
        if (config.get("utilities_RPC", true)) {
          config.set("utilities_RPC", false);
        } else {
          config.set("utilities_RPC", true);
        }
        app.relaunch();
        app.quit();
      }
    }
  }

  
  function LinkBox() {
    function input(msg) {
      var prompting = prompt({
        title: msg,
        label: "กรุณาวางลิงก์เชิญห้องเกมที่นี่:",
        value: paste,
        inputAttrs: {
          type: "url",
        },
        type: "input",
      });
      return prompting;
    }


    function question() {
      const choice = dialog.showMessageBoxSync(initWin, {
        type: "question",
        buttons: ["เล่น (Play)", "รับชม (Spectate)"],
        title: "เข้าร่วมเกม",
        message: "คุณต้องการเข้าร่วมเล่น หรือเข้าไปรับชมการแข่งขัน?",
        defaultId: 0,
        cancelId: 3,
      });
      return choice;
    }

    function isPaste(message, isSpectate) {
      let arr1 = message.split("#");
      let inviteCode = arr1[arr1.length - 1];

      if (isSpectate) {
        initWin.loadURL(`https://venge.io/?client_version=true#Spectate:${inviteCode}`);
      } else {
        initWin.loadURL(`https://venge.io/?client_version=true#${inviteCode}`);
      }
    }

    // !!!!! CHECKS IF LINK IS ALREADY COPIED !!!!!
    let paste = clipboard.readText();
    var choice = question();
    if (paste.indexOf("venge.io/#") === -1) {
      paste = "https://venge.io/#00000";
      if (choice === 0) {
        input("เข้าร่วมเล่น").then((r) => {
          isPaste(r, false);
        });
      } else {
        if (choice === 1) {
          input("เข้าร่วมรับชม").then((r) => {
            isPaste(r, true);
          });
        }
      }
    } else {
      if (choice === 0) {
        isPaste(paste, false);
      } else {
        if (choice === 1) {
          isPaste(paste, true);
        }
      }
    }
  }
}
const { autoUpdater } = require('electron-updater');
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
});
autoUpdater.on('update-available', (info) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['รับทราบ!'],
        title: 'อัปเดต NeXi-Client',
        message: 'มีเวอร์ชันใหม่ของ NeXi-Client ปล่อยออกมาแล้ว',
        detail: 'ตัวอัปเดตจะดาวน์โหลดในพื้นหลังและแจ้งเตือนคุณเมื่อเสร็จสิ้น'
       }
  
       dialog.showMessageBox(dialogOpts).then((returnValue) => {
         if (returnValue.response === 0)
         console.log('User saw New Version message')
       })
});
autoUpdater.on('update-not-available', () => {
    console.log('Version is up-to-date');
});
autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download Speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.transferred} + '/ ${progressObj.total}`);
});
autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['รีสตาร์ททันที', 'ไว้ทีหลัง'],
      title: 'อัปเดตแอปพลิเคชัน',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'ดาวน์โหลดเวอร์ชันใหม่สำเร็จแล้ว รีสตาร์ทแอปพลิเคชันเพื่อปรับใช้การอัปเดต'
     }

     dialog.showMessageBox(dialogOpts).then((returnValue) => {
       if (returnValue.response === 0) autoUpdater.quitAndInstall()
     })
   })
autoUpdater.on('error', (error) => {
    console.log(error)
})

app.on("ready", init);
