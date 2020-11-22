// noinspection JSUnresolvedFunction
const fs = require('fs')
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
const { Client, MessageEmbed, Collection } = require('discord.js')

// noinspection JSUnresolvedFunction
const config = require('./config.json')
// noinspection JSUnresolvedFunction
const banner = require('./functions/banner')
// noinspection JSUnresolvedFunction
const docker = require('./functions/docker')
// noinspection JSUnresolvedFunction
const chunk = require('./functions/chunk')

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
			username: config.SSH.USERNAME,
			password: config.SSH.PASSWORD,
			host: config.SERVER.HOST,
			port: config.SERVER.SSH_PORT,
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

if ((config.BOT.INTERACTIVE_ENABLED || config.BOT.DISCORD_ENABLED) && config.BOT.TELNET_ENABLED) {
	console.log('[Telnet] ! Enabled')

	telnet = new Telnet()

	// noinspection JSUnresolvedFunction
	telnet.on('connect', () => {
		console.log('[Telnet] ! Connected')
	})

	// noinspection JSUnresolvedFunction,JSUnusedLocalSymbols
	telnet.on('ready', prompt => {
		console.log('[Telnet] ! Ready')

		if (config.BOT.INTERACTIVE_ENABLED) {
			io.setPrompt('[Telnet] > ')
			io.prompt()

			io.on('line', command => {
				if (command !== '') {
					// noinspection JSCheckFunctionSignatures,JSIgnoredPromiseFromCall
					telnet.exec(command, (error, response) => {
						if (error) {
							console.log(`[Telnet] ! ${error}`)
						} else {
							console.log(`[Telnet] < ${response}`)
						}

						io.prompt()
					})
				} else {
					io.prompt()
				}
			}).on('close', () => {
				// noinspection JSUnresolvedVariable
				process.exit(0)
			})
		}
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
			irs: config.TELNET.INPUT_SEPARATOR,
			ors: config.TELNET.OUTPUT_SEPARATOR,
			echoLines: 0,
			stripShellPrompt: true,
			debug: config.TELNET.DEBUG
		}

		if (config.BOT.TUNNEL_ENABLED) {
			console.log('[Telnet] ! Tunnel Enabled')

			// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
			tunnel_telnet = tunnel({
				username: config.SSH.USERNAME,
				password: config.SSH.PASSWORD,
				host: config.SERVER.HOST,
				port: config.SERVER.SSH_PORT,
				dstPort: config.SERVER.TELNET_PORT,
				localHost: config.TUNNEL.LOCALHOST,
				localPort: config.TUNNEL.TELNET_PORT,
				keepAlive: true,
				keepaliveInterval: 300
			}, async (error, server) => {
				if (error) {
					console.log(`[Telnet] ! ${error}`)
				} else {
					try {
						// noinspection JSIgnoredPromiseFromCall
						await telnet.connect(params).catch(error => {
							console.log(`[Telnet] ! ${error}`)
						})
					} catch (error) {
						console.log(`[Telnet] ! ${error}`)
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
				console.log(`[Telnet] ! ${error}`)
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

if (config.BOT.INTERACTIVE_ENABLED && !config.BOT.AI_ENABLED && !config.BOT.TELNET_ENABLED) {
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
	discord = new Client()
	discord.commands = new Collection()
	const cooldowns = new Collection()

	// noinspection JSUnresolvedVariable
	const commandFiles = fs.readdirSync(`./src/${config.DISCORD.COMMANDS_DIR}`).filter(file => file.endsWith('.js'))

	for (const file of commandFiles) {
		// noinspection JSUnresolvedFunction,JSUnresolvedVariable
		const command = require(`./${config.DISCORD.COMMANDS_DIR}/${file}`)
		discord.commands.set(command.name, command)
	}

	discord.on('ready', () => {
		console.log(`Logged in as ${discord.user.tag}!`)
	})

	discord.on('message', message => {
		if (message.author.bot) return

		if (message.content.startsWith(config.DISCORD.COMMANDS_DISCORD_PREFIX)) {
			const args = message.content.slice(config.DISCORD.COMMANDS_DISCORD_PREFIX.length).trim().split(/ +/)
			const commandName = args.shift().toLowerCase()
			// noinspection JSUnresolvedVariable
			const command = discord.commands.get(commandName) || discord.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

			if (command) {
				// noinspection JSUnresolvedVariable
				if (command.guildOnly && message.channel.type === 'dm') {
					return message.reply('I can\'t execute that command inside DMs!')
				}

				if (command.args && !args.length) {
					let reply = `You didn't provide any arguments, ${message.author}!`

					if (command.usage) {
						reply += `\nThe proper usage would be: \`${config.DISCORD.COMMANDS_DISCORD_PREFIX}${command.name} ${command.usage}\``
					}

					// noinspection JSUnresolvedFunction
					return message.channel.send(reply)
				}

				if (!cooldowns.has(command.name)) {
					cooldowns.set(command.name, new Collection())
				}

				const now = Date.now()
				const timestamps = cooldowns.get(command.name)
				// noinspection JSUnresolvedVariable
				const cooldownAmount = (command.cooldown || 3) * 1000

				if (timestamps.has(message.author.id)) {
					const expirationTime = timestamps.get(message.author.id) + cooldownAmount

					if (now < expirationTime) {
						const timeLeft = (expirationTime - now) / 1000

						return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`)
					}
				}

				timestamps.set(message.author.id, now)
				setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)

				try {
					command.execute(message, args)
				} catch (error) {
					console.error(error)
					// noinspection JSIgnoredPromiseFromCall
					message.reply('there was an error trying to execute that command!')
				}
			}
		} else if (message.content.startsWith(config.DISCORD.COMMANDS_SERVER_PREFIX)) {
			if (config.BOT.TELNET_ENABLED && telnet) {
				let hasAccess = message.member.roles.cache.some(role => {
					return [config.DISCORD.ROLE_OWNER_ID,
						config.DISCORD.ROLE_QA_DEVELOPER_ID,
						config.DISCORD.ROLE_DEVELOPER_ID,
						config.DISCORD.ROLE_TRIAL_DEVELOPER_ID,
						config.DISCORD.ROLE_HEAD_GAME_MASTER_ID,
						config.DISCORD.ROLE_TRIAL_GAME_MASTER_ID].includes(role.id)
				})

				const command = message.content.substring(1)
				// noinspection JSUnresolvedVariable
				console.log(`[${message.author.id}] ${message.author.username}#${message.author.discriminator}`, command, hasAccess)

				if (hasAccess) {
					if (command !== '') {
						telnet.exec(command, (error, response) => {
							if (error) {
								console.log(`[Telnet] ! ${error}`)
								// noinspection JSUnresolvedFunction
								message.channel.reply(error)
							} else {
								console.log(`[Telnet] < ${response}`)
								if (response !== '') {
									if (response.length > config.DISCORD.MAX_MESSAGE_LENGTH) {
										let chunks = chunk(response, config.DISCORD.MAX_MESSAGE_LENGTH)

										chunks.forEach(chunk => {
											// noinspection JSUnresolvedFunction
											message.channel.send(chunk)
										})
									} else {
										// noinspection JSUnresolvedFunction
										message.channel.send(response)
									}
								} else {
									// noinspection JSIgnoredPromiseFromCall
									message.reply('Empty response from server...')
								}
							}
						})
					}
				} else {
					// noinspection JSIgnoredPromiseFromCall
					message.reply('You must be a GM to run server commands...')
				}
			} else {
				// noinspection JSIgnoredPromiseFromCall
				message.reply('Telnet is not connected, try again later...')
			}
		} else if (message.mentions.users.find(user => user.id === config.DISCORD.BOT_ID)) {
			if (config.BOT.AI_ENABLED && bot) {
				// noinspection JSUnresolvedFunction
				bot.reply(message.author.id, message.content).then(reply => {
					// noinspection JSCheckFunctionSignatures,JSIgnoredPromiseFromCall
					message.reply(reply)
				}).catch(error => {
					console.error(error)
				})
			} else {
				// noinspection JSIgnoredPromiseFromCall
				message.reply('AI is not connected, try again later...')
			}
		}
	})

	// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall
	discord.login(config.DISCORD.BOT_TOKEN)
}