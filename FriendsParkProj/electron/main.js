const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        autoHideMenuBar: true,
        webPreferences: {
            // Cocos Web 构建产物需要禁用同源策略才能正常加载本地资源
            webSecurity: false,
            contextIsolation: false,
            nodeIntegration: false,
        },
    });

    // 加载 Cocos Web 构建产物（已复制到 electron/web-desktop/）
    mainWindow.loadFile(path.join(__dirname, 'web-desktop', 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // macOS 上应用通常在关闭所有窗口后仍保持活动，这里统一退出
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
