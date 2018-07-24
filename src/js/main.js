const electron = require('electron')
// Module to control application life.
const app = electron.app
const Menu = electron.Menu
const Tray = electron.Tray
const dialog = electron.dialog
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const imgSizeOf = require('image-size')
const fs = require('fs')
const pkg = require(path.join(__dirname, 'package.json'))
const openAboutWindow = require('electron-about-window').default
const Settings = require('./electron-settings-wrap')
const config = new Settings({
	bounds: {
		width: 224,
		height: 52
	},
	alwaysOnTop: false,
	clickThrough: false,
	lastImgDir: app.getPath('pictures')
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null
let aboutWindow = null
let contents = null
let trayIcon = null

function createWindow () {
	let bounds = config.get('bounds')
	let onTop = config.get('alwaysOnTop')
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: bounds.width,
		height: bounds.height,
		x: bounds.x,
		y: bounds.y,
		transparent: true,
		frame: false,
		skipTaskbar: true,
		show: false,
		fullscreenable: false,
		useContentSize: true,
		alwaysOnTop: onTop,
		minimizable: false,
		maximizable: false,
		resizable: false,
		title: app.getName(),
		icon: path.join(__dirname, 'app_icon.ico'),
		webPreferences: {
			webgl: false,
			webaudio: false
		}
	})
	mainWindow.once('ready-to-show', () => {
		mainWindow.show()
		let imgPath = config.get('image')
		let clickThrough = config.get('clickThrough')

		if (typeof imgPath === 'string') {
			fs.stat(imgPath, (err, stats) => {
				if (err === null) {
					setImage(imgPath)
				}
			})
		}

		if (typeof clickThrough === 'boolean') {
			setClickThroughState(clickThrough)
		}
	})

	contents = mainWindow.webContents

	// and load the index.html of the app.
	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	mainWindow.on('close', () => {
		config.set('bounds', mainWindow.getBounds())
	})
	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		// localStorage.setItem("windowPosition", JSON.stringify(mainWindow.getPosition()))
		mainWindow = null
	})
}

const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
	// Someone tried to run a second instance, we should focus our window.
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.focus()
	}
})

if (isSecondInstance) {
	app.quit()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	createWindow()
	createTrayIcon()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function createTrayIcon() {
	let onTop  = config.get('alwaysOnTop')
	let clickThrough = config.get('clickThrough')
	trayIcon = new Tray(path.join(__dirname, 'tray_icon.png'));

	// add contextmenu to tasktray icon.
	let trayMenu = Menu.buildFromTemplate([
		{
			label: 'クリックスルー',
			type: 'checkbox',
			checked: clickThrough,
			click: (item) => { setClickThroughState(item.checked) }
		},
		{
			label: '常に前面に表示',
			type: 'checkbox',
			checked: onTop,
			click: (item) => { setAlwaysOnTopState(item.checked) }
		},
		{ label: '画像選択', click: () => { selectImage() } },
		{ type: 'separator' },
		{ label: '表示', click: () => { mainWindow.focus() } },
		{ type: 'separator' },
		{ label: app.getName() + 'について',  click: () => { openAboutWindow({
			icon_path: path.join(__dirname, 'app_icon.png'),
			description: pkg.description,
			copyright: 'Cpyright (c) 2017, 来栖華紅鴉',
			license: pkg.license,
			homepage: 'https://github.com/KaguaKurusu/cerexe',
			win_options: {
				parent: mainWindow,
				modal: true,
				skipTaskbar: true,
				useContentSize: true,
				titleBarStyle: 'hidden-inset',
				minimizable: false,
				maximizable: false,
				resizable: false
			}
		}) } },
		{type: 'separator'},
		{ label: '終了', click: () => { mainWindow.close() } }
	])
	trayIcon.setContextMenu(trayMenu)
	trayIcon.setToolTip(app.getName())
	trayIcon.on('clicked', () => {
		mainWindow.focus()
	})
}

function selectImage() {
	let pictDir = config.get('lastImgDir')

	fs.stat(pictDir, (err, stat) => {
		if (err !== null) {
			pictDir = app.getPath('pictures')
		}

		dialog.showOpenDialog(
			mainWindow,
			{
				title: '画像選択',
				defaultPath: pictDir,
				filters: [ {name: '画像', extensions: ['jpg', 'png', 'gif']} ]
			},
			filePaths => {
				if (filePaths === undefined) {
					return
				}
				else {
					setImage(filePaths[0])
					config.set('lastImgDir', path.dirname(filePaths[0]))
				}
			}
		)
	})
}

function setImage(filePath) {
	let fileSize = imgSizeOf(filePath)

	mainWindow.setSize(fileSize.width, fileSize.height + 54)
	contents.send('set-image', filePath)
	config.set('image', filePath)
}

function setAlwaysOnTopState(state) {
	if (state !== true) state = false
	mainWindow.setAlwaysOnTop(state)
	config.set('alwaysOnTop', state)
}

function setClickThroughState(state) {
	if (state !== true) state = false
	mainWindow.setIgnoreMouseEvents(state)
	config.set('clickThrough', state)
}
