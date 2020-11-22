// noinspection JSUnresolvedFunction
const net = require('net')

async function check({ host, port, timeout = 1000 } = {}) {
	const promise = new Promise(((resolve, reject) => {
		const socket = new net.Socket()

		const onError = () => {
			socket.destroy()
			reject()
		}

		socket.setTimeout(timeout)
		socket.once('error', onError)
		socket.once('timeout', onError)

		socket.connect(port, host, () => {
			socket.end()
			resolve()
		})
	}))

	try {
		await promise
		return true
	} catch (error) {
		console.log(error)
		return false
	}
}

// noinspection JSUnresolvedVariable
module.exports = check