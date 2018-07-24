// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron')
const ipc = electron.ipcRenderer
require('./clock')

ipc.on('set-image', (event, arg) => {
	document.getElementById('img').innerHTML = '<img src="' + arg + '">'
})
