const fs = require("fs")
const path = require("path")
const { app, autoUpdater, BrowserWindow, ipcMain, dialog } = require('electron')
if (require('electron-squirrel-startup')) return;

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        transparent: true,
        resizable: false,
        frame: false,
        backgroundColor: "#00000000",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    })
    // win.webContents.openDevTools();
    win.loadFile('index.html')

    ipcMain.on("close", () => {
        win.close();
        app.quit();
    });

    ipcMain.on("minimize", () => {
        win.minimize();
    });
    ipcMain.on("openFolder", (event, arg) => {
        dialog.showOpenDialog(win, {
            title: '选择文件夹',
            filters: [
                { name: 'Audio', extensions: ['mp3', 'wma', 'acc'] }
            ],
            properties: ['openFile', 'multiSelections']
        }).then((e) => {
            if (!e.canceled) {
                event.reply('openFolder-reply', e.filePaths)
            }
        })
    })
    ipcMain.on("saveBlob", (event, arg) => {
        fs.writeFileSync(path.join(__dirname, arg.name + '.webm'), arg.blob)
    })
}
function checkForUpdate() {
    autoUpdater.on("update-available", info => {
        dialog.showMessageBox({
            title: "更新提示",
            message: "有新内容更新，稍后将重新为您安装",
            buttons: ["确定"],
            type: "info",
            noLink: true
        });
    });
    require('update-electron-app')()
}

app.commandLine.appendSwitch("--disable-http-cache");
app.disableHardwareAcceleration();

app.whenReady().then(() => {
    createWindow()
    checkForUpdate()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})