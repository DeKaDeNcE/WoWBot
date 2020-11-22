// noinspection JSUnresolvedFunction
const readline = require('readline')
// noinspection JSUnresolvedFunction
const RiveScript = require('rivescript')
// noinspection JSUnresolvedFunction
const Telnet = require('telnet-client')
// noinspection JSUnresolvedFunction
const tunnel = require('tunnel-ssh')
// noinspection JSUnresolvedFunction
const mysql = require('mysql')

// noinspection JSUnresolvedFunction
const config = require('./config.json')
// noinspection JSUnresolvedFunction
const banner = require('./banner')
// noinspection JSUnresolvedFunction
const docker = require('./docker')

let discord
let bot
let telnet
let tunnel_mysql
let tunnel_telnet
let db
let io

// noinspection JSUnresolvedVariable
if (config.BOT.SHOW_BANNER) {
	console.log(banner())
}

if (docker()) {
	console.log('[Engine] I am running inside a Docker container.')
} else {
	console.log('[Engine] I am NOT running inside a Docker container.')
}

if (config.BOT.INTERACTIVE_ENABLED) {
	console.log('[Interactive] ! Enabled')
	// noinspection JSUnresolvedVariable
	io = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})
}

// noinspection JSUnresolvedVariable
if (config.BOT.DATABASE_ENABLED) {
	console.log('[DB] ! Enabled')

	// noinspection JSUnresolvedVariable
	db = mysql.createConnection({
		host: config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.HOST : config.DATABASE.HOST,
		port: config.BOT.TUNNEL_ENABLED ? config.TUNNEL.DATABASE_PORT : (config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.PORT : config.DATABASE.PORT),
		user: config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.USERNAME : config.DATABASE.USERNAME,
		password: config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.PASSWORD : config.DATABASE.PASSWORD,
		debug: config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.DEBUG : config.DATABASE.DEBUG
	})

	if (config.BOT.TUNNEL_ENABLED) {
		// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
		tunnel_mysql = tunnel({
			username: config.TUNNEL.USERNAME,
			password: config.TUNNEL.PASSWORD,
			host: config.TUNNEL.HOST,
			port: config.TUNNEL.PORT,
			dstPort: config.DATABASE.PORT,
			localHost: config.TUNNEL.LOCALHOST,
			localPort: config.TUNNEL.DATABASE_PORT,
			keepAlive: true,
			keepaliveInterval: 300
		}, (error, server) => {
			if (error) {
				console.log(error)
			} else {
				db.connect()

				// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
				db.query(`SELECT * FROM ${config.DATABASE.DATABASE_AUTH}.realmlist`, (error, results, fields) => {
					if (error) {
						console.log(error)
					} else {
						// noinspection JSUnresolvedVariable
						console.log('The solution is: ', results)
					}

					db.end()
					// noinspection JSUnresolvedFunction
					tunnel_mysql.close()
				})
			}
		})
	} else {
		db.connect()

		// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
		db.query(`SELECT * FROM ${(config.DATABASE.TEST ? config.DATABASE.DATABASE_TEST.DATABASE_AUTH : config.DATABASE.DATABASE_AUTH)}.realmlist`, (error, results, fields) => {
			if (error) {
				console.log(error)
			} else {
				// noinspection JSUnresolvedVariable
				console.log('The solution is: ', results)
			}

			db.end()
		})
	}
}

if (config.BOT.AI_ENABLED) {
	console.log('[AI] ! Enabled')
	// noinspection JSCheckFunctionSignatures,JSUnusedGlobalSymbols
	bot = new RiveScript({
		debug: config.AI.DEBUG,
		onDebug: msg => {
			console.log(msg)
		}
	})
}

if (config.BOT.INTERACTIVE_ENABLED && config.BOT.TELNET_ENABLED) {
	console.log('[Telnet] ! Enabled')

	telnet = new Telnet()

	// noinspection JSUnresolvedFunction
	telnet.on('connect', () => {
		console.log('[Telnet] ! Connected')
	})

	// noinspection JSUnresolvedFunction,JSUnusedLocalSymbols
	telnet.on('ready', prompt => {
		console.log('[Telnet] ! Ready')

		io.setPrompt('[Telnet] > ')
		io.prompt()

		io.on('line', command => {
			if (command !== '') {
				// noinspection JSCheckFunctionSignatures,JSIgnoredPromiseFromCall
				telnet.exec(command, (err, response) => {
					console.log(`[Telnet] < ${response}`)
					io.prompt()
				})
			} else {
				io.prompt()
			}
		}).on('close', () => {
			// noinspection JSUnresolvedVariable
			process.exit(0)
		})
	})

	// noinspection JSUnresolvedFunction
	telnet.on('writedone', () => {
		if (config.TELNET.DEBUG) {
			console.log('[Telnet] ! Write Done')
		}
	})

	// noinspection JSUnresolvedFunction
	telnet.on('data', buffer => {
		if (config.TELNET.DEBUG) {
			console.log(`[Telnet] ! Data: ${buffer}`)
		}
	})

	// noinspection JSUnresolvedFunction
	telnet.on('timeout', () => {
		console.log('[Telnet] ! Socket Timeout')
		// noinspection JSIgnoredPromiseFromCall
		telnet.end()
	})

	// noinspection JSUnresolvedFunction
	telnet.on('failedlogin', () => {
		console.log('[Telnet] ! Failed Login')
	})

	// noinspection JSUnresolvedFunction
	telnet.on('error', () => {
		console.log('[Telnet] ! Error')
	})

	// noinspection JSUnresolvedFunction
	telnet.on('end', () => {
		console.log('[Telnet] ! Disconnected')
	})

	// noinspection JSUnresolvedFunction
	telnet.on('close', () => {
		console.log('[Telnet] ! Connection Closed')
	})

	async function connect() {
		const params = {
			host: config.BOT.TUNNEL_ENABLED ? config.TUNNEL.LOCALHOST : config.SERVER.HOST,
			port: config.BOT.TUNNEL_ENABLED ? config.TUNNEL.TELNET_PORT : config.SERVER.TELNET_PORT,
			loginPrompt: /Username[: ]*/i,
			passwordPrompt: /Password[: ]*/i,
			failedLoginMatch: config.TELNET.FAILED_LOGIN,
			shellPrompt: config.TELNET.PROMPT,
			username: config.TELNET.TEST ? config.TELNET.TELNET_TEST.USERNAME : config.TELNET.USERNAME,
			password: config.TELNET.TEST ? config.TELNET.TELNET_TEST.PASSWORD : config.TELNET.PASSWORD,
			timeout: config.TELNET.TIMEOUT,
			irs: '\r\n',
			ors: '\r\n',
			debug: config.TELNET.DEBUG
		}

		if (config.BOT.TUNNEL_ENABLED) {
			console.log('[Telnet] ! Tunnel Enabled')

			// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
			tunnel_telnet = tunnel({
				username: config.TUNNEL.USERNAME,
				password: config.TUNNEL.PASSWORD,
				host: config.TUNNEL.HOST,
				port: config.TUNNEL.PORT,
				dstPort: config.SERVER.TELNET_PORT,
				localHost: config.TUNNEL.LOCALHOST,
				localPort: config.TUNNEL.TELNET_PORT,
				keepAlive: true,
				keepaliveInterval: 300
			}, async (error, server) => {
				if (error) {
					console.log(error)
				} else {
					try {
						// noinspection JSIgnoredPromiseFromCall
						await telnet.connect(params).catch(error => {
							console.log(`[Telnet] ! ${error}`)
						})
					} catch (error) {
						throw error
					}
				}
			})
		} else {
			try {
				// noinspection JSIgnoredPromiseFromCall
				await telnet.connect(params).catch(error => {
					console.log(`[Telnet] ! ${error}`)
				})
			} catch (error) {
				throw error
			}
		}
	}

	connect().catch(error => {
		console.log(`[Telnet] ! ${error}`)
	})
}

if (config.BOT.AI_ENABLED) {
	// noinspection JSUnusedLocalSymbols, JSCheckFunctionSignatures
	bot.loadDirectory(`./src/${config.AI.CONTENT_DIR}`).then(() => {
		bot.sortReplies()

		console.log('Content loaded!')

		io.setPrompt(`[${config.BOT.USER_NAME}] `)
		io.prompt()

		io.on('line', command => {
			if (command === '/quit') {
				// noinspection JSUnresolvedVariable
				process.exit(0)
			} else {
				// noinspection JSUnresolvedFunction
				bot.reply(config.BOT.USER_NAME, command).then(reply => {
					console.log('[Sylvannas] ' + reply)
					io.prompt()
				}).catch(err => {
					console.error(err)
					io.prompt()
				})
			}
		}).on('close', () => {
			// noinspection JSUnresolvedVariable
			process.exit(0)
		})
	}).catch((error, filename, lineno) => {
		console.log('Error when loading files: ' + error)
	})
}

if (!config.BOT.AI_ENABLED && !config.BOT.TELNET_ENABLED) {
	// noinspection JSUnusedLocalSymbols
	io.on('line', command => {
		console.log('[Engine] AI and Telnet is disabled, nobody here to respond...')
	}).on('close', () => {
		// noinspection JSUnresolvedVariable
		process.exit(0)
	})
}

if (config.BOT.DISCORD_ENABLED) {
	// noinspection JSUnresolvedFunction
	discord = require('./discord')
}