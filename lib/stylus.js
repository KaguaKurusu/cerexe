const stylus = require('stylus')

module.exports = function buildStylus(option, buffer) {
	return new Promise((resolve, reject) => {
		stylus(buffer.toString(), option).render((err, data) => {
			if (err) reject(err)
			else resolve(data)
		})
	})
}
