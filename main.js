const { app, BrowserWindow, ipcMain, shell, Menu, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const http = require('http');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

// ---------- Auto Updater ----------
autoUpdater.autoDownload = true;
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new update is ready to install. Restart application to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

// ---------- portable data path ----------
function getDataPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), 'data');
  }
  return path.join(__dirname, 'data');
}

function ensureDataDir() {
  const dir = getDataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const defaults = {
    'threads.json': JSON.stringify({}, null, 2),
    'personalities.json': JSON.stringify([
      {
        id: 'default',
        name: 'Standard-Assistent',
        nutzer_info: 'Keine besonderen Informationen.',
        verhalten: 'Sei freundlich, hilfsbereit und antworte präzise auf Deutsch.'
      }
    ], null, 2),
    'settings.json': JSON.stringify({
      ollama_url: 'http://localhost:11434',
      memory_depth: 20,
      default_personality_id: 'default'
    }, null, 2)
  };

  for (const [file, content] of Object.entries(defaults)) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, content, 'utf-8');
  }
}

// ---------- IPC handlers ----------
ipcMain.handle('read-file', async (_event, fileName) => {
  try {
    const fp = path.join(getDataPath(), fileName);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf-8');
  } catch (e) {
    console.error('read-file error:', e);
    return null;
  }
});

ipcMain.handle('write-file', async (_event, fileName, data) => {
  try {
    const fp = path.join(getDataPath(), fileName);
    fs.writeFileSync(fp, data, 'utf-8');
    return true;
  } catch (e) {
    console.error('write-file error:', e);
    return false;
  }
});

ipcMain.handle('check-ollama', async (_event, url) => {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url || 'http://localhost:11434');
    const req = http.get(`${parsedUrl.origin}/api/tags`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
});

ipcMain.handle('start-ollama', async () => {
  try {
    // Check if ollama is in path
    return new Promise((resolve) => {
      exec('ollama --version', (err) => {
        if (err) {
          console.error('Ollama not found in path');
          resolve({ success: false, error: 'Ollama not found in PATH' });
          return;
        }

        const child = spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
        resolve({ success: true });
      });
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-external', async (_event, url) => {
  shell.openExternal(url);
});

const https = require('https');

ipcMain.handle('web-search', async (_event, query) => {
  return new Promise((resolve) => {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const results = [];
          // Simple regex to extract DuckDuckGo HTML results
          const resultRegex = /<a class="result__url" href="([^"]+)".*?>.*?<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
          let match;
          while ((match = resultRegex.exec(data)) !== null && results.length < 5) {
            let url = match[1];
            if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
              try { url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]); } catch (e) {}
            }
            // Strip HTML from snippet
            const snippet = match[2].replace(/<[^>]+>/g, '').trim();
            results.push({ url, snippet });
          }
          resolve(results);
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve([]);
    });
  });
});

ipcMain.handle('fetch-url', async (_event, url) => {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Very basic HTML to text stripping
        let text = data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        // Return max 5000 chars to avoid overloading the AI
        resolve(text.substring(0, 5000));
      });
    });
    req.on('error', (err) => resolve(`Error: ${err.message}`));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve('Error: Timeout');
    });
  });
});


// ---------- window ----------
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // mainWindow.setMenuBarVisibility(false); // Global Menu.setApplicationMenu(null) handles this

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL('app://-/index.html');
  }

  // Handle window.open for the Terminal
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('terminal=true')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 800,
          height: 600,
          backgroundColor: '#000',
          autoHideMenuBar: true,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      };
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const requestUrl = new URL(request.url);
    let filePath = path.join(__dirname, 'dist', decodeURIComponent(requestUrl.pathname));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(__dirname, 'dist', 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  ensureDataDir();
  Menu.setApplicationMenu(null);
  createWindow();
  
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
