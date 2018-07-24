'use strict';
const Settings = require('electron-settings/lib/settings')
const Helpers = require('electron-settings/lib/settings-helpers')

class SettingsWrap extends Settings {
	constructor(defaultValues) {
		super()

		this.defaultValues = defaultValues
	}

	get(keyPath, opts = {}) {
		const obj = this.defaultValues

		if (keyPath !== '') {
			const value = Helpers.getValueAtKeyPath(obj, keyPath)

			return super.get(keyPath, value, opts)
		}

		return obj
	}
}

module.exports = SettingsWrap
