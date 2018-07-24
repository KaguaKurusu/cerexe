const pug = require('pug')

module.exports = function buildPug(option, vars, file){
	return new Promise((resolve, reject) => {
		let html = pug.compileFile(file, option)(vars)
		resolve(html)
	})
}
