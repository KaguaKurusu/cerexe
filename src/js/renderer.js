
const electron = require('electron')
const ipc = electron.ipcRenderer
require('./clock')

ipc.on('set-image', (event, arg) => {
	img.innerHTML = `<img src="${arg}">`
})
