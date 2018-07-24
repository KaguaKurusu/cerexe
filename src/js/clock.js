// 時計の描画処理をスタート
const sprintf = require('sprintf-js').sprintf
digitalClock()

function digitalClock () {
	let d = new Date()

	updateDigitalClock(d)

	let delay = 1000 - new Date().getMilliseconds()
	setTimeout(digitalClock, delay)
}

function updateDigitalClock (d) {
	clock.innerHTML = sprintf(
		'%04d/%02d/%02d (%s)<br>%02d:%02d:%02d',
		d.getFullYear(),
		d.getMonth() + 1,
		d.getDate(),
		['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
		d.getHours(),
		d.getMinutes(),
		d.getSeconds()
	)
}
