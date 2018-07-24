const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const gaze = require('gaze')
const {exec} = require('child_process')
const os = require('os')
const packager = require("electron-packager")

const stylus = require('./lib/stylus')
const pug = require ('./lib/pug')
const js = require('./lib/js')
const config = require('./config/config')
const pkg = require('./package.json')
const command = process.argv[2]

String.prototype.capitalize = function(){
	return this.charAt(0).toUpperCase() + this.slice(1);
}

let dirs = {
	src: 'src',
	dist: 'public',
	patch: 'patch',
	release: 'release',
	installer: 'installer'
}

let paths = {
	stylus: path.join(dirs.src, '/stylus/**/!(_)*.stylus'),
	pug: path.join(dirs.src, '/pug/**/!(_)*.pug'),
	js: path.join(dirs.src, '/js/**/!(_)*.js')
}

let fn = {
	stylus: buildStylus,
	pug: buildPug,
	js: minifyJS
}

fs.mkdirp(dirs.dist)

switch (command) {
	case 'stylus':
	case 'pug':
	case 'js':
		fileList(paths[command])
			.then(files => {
				Promise.all(files.map(fn[command].bind(null, config[command])))
			})
			.then(() => console.log(`${command.capitalize()} build finished!`))
			.catch(err => console.error(err))
		break
	case 'package':
		copyPackageJson()
		break
	case 'image':
		fs.copy(path.join(dirs.src, '/img'), dirs.dist)
			.catch(err => console.error(err))
		break
	case 'release':
		release(process.platform, os.arch())
		break
	case 'release:all':
		release(process.platform, 'all')
	case 'make':
		makeInstaller()
			// .then(str => console.log(str))
			.then(() => console.log('Installer create finished!'))
			.catch(err => console.error(err))
		break
	case 'watch':
		startWatch(config.watch)
		break
	case 'clean':
		rmdir(dirs.dist)
		rmdir(dirs.release)
		break
}

function buildStylus(config, file) {
	fs.readFile(file)
		.then(stylus.bind(null, config))
		.then(fs.outputFile.bind(null, distPath('css', file)))
		.catch(err => console.log(err))
}

function buildPug(config, file) {
	pug(config, {
		// variable in Pug
		'app_name': pkg.name,
		'app_ver': pkg.version,
		'author': pkg.author,
		'repository': pkg.repository
	}, file)
		.then(fs.outputFile.bind(null, distPath('html', file)))
		.catch(err => console.log(err))
}

function minifyJS(config, file) {
	fs.readFile(file)
		.then(js.bind(null, config))
		.then(fs.outputFile.bind(null, distPath('js', file)))
		.catch(err => console.log(err))
}

function copyPackageJson() {
	// Copy package.json
	let keys = ['name', 'version', 'main', 'author', 'license','dependencies']
	let data = {}

	pkg.main = 'main.js'
	keys.forEach(key => {
		data[key] = pkg[key]
	})
	fs.outputJson(path.join(dirs.dist, 'package.json'), data)
		.then(installNodeModules.bind(null))
		.then(data => console.log(data))
		.catch(err => console.error(err))
}

function installNodeModules() {
	return new Promise((resolve, reject) => {
		exec('npm i', { cwd: dirs.dist }, (err, stdout, stderr) => {
			if (err) reject(err)
			else resolve(stdout)
		})
	})
}

function release(platform, arch) {
	let option = {
		name: pkg.name,
		dir: dirs.dist,
		out: dirs.release,
		overwrite: true,
		asar: true,
		appVersion: pkg.version,
		appCopyright: `Copyright (C) 2018 ${pkg.author}.`
	}

	switch (platform) {
		case 'win32':
			option.icon = 'icon/win/app.icon'
			option.platform = platform
			option.win32metadata = {
				CompanyName: pkg.autor,
				FileDescription: pkg.name,
				OriginalFilename: `${pkg.name}.exe`,
				ProductName: pkg.name,
				InternalName: pkg.name
			}
			break
		case 'darwin':
			option.icon = 'icon/mac/app.icns'
	}

	switch (arch) {
		case 'x64':
		case 'x86_64':
		case 'amd64':
			option.arch = 'x64'
			break
		case 'ia32':
		case 'x86':
			option.arch = 'ia32'
			break
		case 'all':
		default:
			option.arch = 'all'
	}

	packager(option)
		.then(data => console.log(data))
		.catch(err => console.error(err))
}

function makeInstaller() {
	return new Promise((resolve, reject) => {
		switch (process.platform) {
			case 'win32':
				exec('Compil32.exe /cc installer\\Setup.iss', (err, stdout, stderr) => {
					if (err) reject(err)
					else resolve(stdout)
				})
				break
			case 'darwin':
				reject(new Error('インストーラは不要です'))
				break
			default:
				reject(new Error("インストーラ作成方法ないよ"))
		}
	})
}

function startWatch() {
	gaze(path.join(dirs.src, '/**/*.stylus'), (err, watcher) => {
		if (err) console.error(err)
		watcher.on('all', (ev, file) => {
			buildStylus(config.stylus, file)
		})
	})

	gaze(path.join(dirs.src, '/**/*.pug'), (err, watcher) => {
		if (err) console.error(err)
		watcher.on('all', (ev, file) => {
			buildPug(config.pug, file)
		})
	})

	gaze(path.join(dirs.src, '/**/*.js'), (err, watcher) => {
		if (err) console.error(err)
		watcher.on('all', (ev, file) => {
			minifyJS(config.js, file)
		})
	})

	gaze('package.json', (err, watcher) => {
		if (err) console.error(err)
		watcher.on('all', () => { copyPackageJson() })
	})

	gaze(path.join(dirs.patch, '/**/*/patch'), (err, watcher) => {
		if (err) console.error(err)
		watcher.on('all', (ev, file) => {
			patchApplay(file)
		})
	})
}

function fileList(pattern, option = {}) {
	return new Promise((resolve, reject) => {
		glob(pattern, option, (err, files) => {
			if (err) reject(err)
			else resolve(files)
		})
	})
}

function distPath(ext, file) {
	let parse = path.parse(file)

	return path.join(
		dirs.dist,
		`${parse.name}.${ext}`
	)
}

function rmdir(dir) {
	fs.remove(dir, err => {
		if (err) console.log(err)
	})
}
