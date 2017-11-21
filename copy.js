const fs = require('fs-extra')

fs.emptyDir('tmp', err => {
	if (err) return console.error(err)

	fs.copy('src', 'tmp', err => {
		if (err) return console.error(err)
	})

	fs.copy('package.json', 'tmp/package.json', err => {
		if (err) return console.error(err)
	})

	fs.copy('node_modules', 'tmp/node_modules', err => {
		if (err) return console.error(err)
	})
})
