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
// noinspection JSUnresolvedFunction,JSUnusedLocalSymbols
const { Client, MessageEmbed, Collection } = require('discord.js')

// noinspection JSUnresolvedFunction
const CONFIG = require('./config.json')
// noinspection JSUnresolvedFunction
const banner = require('./functions/banner')
// noinspection JSUnresolvedFunction
const docker = require('./functions/docker')
// noinspection JSUnresolvedFunction
const chunk = require('./functions/chunk')

const replyOK = () => {
	return CONFIG.BOT.BOT_REPLY_OK[Math.floor(Math.random() * CONFIG.BOT.BOT_REPLY_OK.length)]
}

let discord
let bot
let telnet
let tunnel_mysql
let tunnel_telnet
let db
let io

if (CONFIG.BOT.BANNER_ENABLED) {
	console.log(banner())
}

if (docker()) {
	console.log('[Engine] I am running inside a Docker container.')
} else {
	console.log('[Engine] I am NOT running inside a Docker container.')
}

if (CONFIG.BOT.INTERACTIVE_ENABLED) {
	console.log('[Interactive] ! Enabled')
	// noinspection JSUnresolvedVariable
	io = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})
}

if (CONFIG.BOT.DATABASE_ENABLED) {
	console.log('[DB] ! Enabled')

	db = mysql.createConnection({
		host: CONFIG.DATABASE.HOST,
		port: CONFIG.BOT.TUNNEL_ENABLED ? CONFIG.TUNNEL.DATABASE_PORT : CONFIG.DATABASE.PORT,
		user: CONFIG.DATABASE.USERNAME,
		password: CONFIG.DATABASE.PASSWORD,
		debug: CONFIG.DATABASE.DEBUG
	})

	if (CONFIG.BOT.TUNNEL_ENABLED) {
		// noinspection JSUnusedLocalSymbols
		tunnel_mysql = tunnel({
			username: CONFIG.SSH.USERNAME,
			password: CONFIG.SSH.PASSWORD,
			host: CONFIG.SERVER.HOST,
			port: CONFIG.SERVER.SSH_PORT,
			dstPort: CONFIG.DATABASE.PORT,
			localHost: CONFIG.TUNNEL.LOCALHOST,
			localPort: CONFIG.TUNNEL.DATABASE_PORT,
			keepAlive: true,
			keepaliveInterval: 300
		}, (error, server) => {
			if (error) {
				console.log(error)
			} else {
				db.connect()

				// noinspection JSUnusedLocalSymbols
				db.query(`SELECT * FROM ${CONFIG.DATABASE.DATABASE_AUTH}.realmlist`, (error, results, fields) => {
					if (error) {
						console.log(error)
					} else {
						console.log('The solution is: ', results)
					}

					db.end()

					tunnel_mysql.close()
				})
			}
		})
	} else {
		db.connect()

		// noinspection JSUnusedLocalSymbols
		db.query(`SELECT * FROM ${CONFIG.DATABASE.DATABASE_AUTH}.realmlist`, (error, results, fields) => {
			if (error) {
				console.log(error)
			} else {
				console.log('The solution is: ', results)
			}

			db.end()
		})
	}
}

if (CONFIG.BOT.AI_ENABLED) {
	console.log('[AI] ! Enabled')
	// noinspection JSCheckFunctionSignatures,JSUnusedGlobalSymbols
	bot = new RiveScript({
		debug: CONFIG.AI.DEBUG,
		onDebug: message => {
			console.log(message)
		}
	})
}

if ((CONFIG.BOT.INTERACTIVE_ENABLED || CONFIG.BOT.DISCORD_ENABLED) && CONFIG.BOT.TELNET_ENABLED) {
	console.log('[Telnet] ! Enabled')

	telnet = new Telnet()

	telnet.on('connect', () => {
		console.log('[Telnet] ! Connected')
	})

	// noinspection JSUnusedLocalSymbols
	telnet.on('ready', prompt => {
		console.log('[Telnet] ! Ready')

		if (CONFIG.BOT.INTERACTIVE_ENABLED) {
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

	telnet.on('writedone', () => {
		if (CONFIG.TELNET.DEBUG) {
			console.log('[Telnet] ! Write Done')
		}
	})

	telnet.on('data', buffer => {
		if (CONFIG.TELNET.DEBUG) {
			console.log(`[Telnet] ! Data: ${buffer}`)
		}
	})

	telnet.on('timeout', () => {
		console.log('[Telnet] ! Socket Timeout')
		// noinspection JSIgnoredPromiseFromCall
		telnet.end()
	})

	telnet.on('failedlogin', () => {
		console.log('[Telnet] ! Failed Login')
	})

	telnet.on('error', () => {
		console.log('[Telnet] ! Error')
	})

	telnet.on('end', () => {
		console.log('[Telnet] ! Disconnected')
	})

	telnet.on('close', () => {
		console.log('[Telnet] ! Connection Closed')
	})

	async function connect() {
		const params = {
			host: CONFIG.BOT.TUNNEL_ENABLED ? CONFIG.TUNNEL.LOCALHOST : CONFIG.SERVER.HOST,
			port: CONFIG.BOT.TUNNEL_ENABLED ? CONFIG.TUNNEL.TELNET_PORT : CONFIG.SERVER.TELNET_PORT,
			username: CONFIG.TELNET.USERNAME,
			password: CONFIG.TELNET.PASSWORD,
			failedLoginMatch: CONFIG.TELNET.FAILED_LOGIN,
			shellPrompt: CONFIG.TELNET.PROMPT,
			loginPrompt: new RegExp(CONFIG.TELNET.PROMPT_USERNAME, 'i'),
			passwordPrompt: new RegExp(CONFIG.TELNET.PROMPT_PASSWORD, 'i'),
			timeout: CONFIG.TELNET.TIMEOUT_INACTIVITY,
			execTimeout: CONFIG.TELNET.TIMEOUT_EXEC,
			sendTimeout: CONFIG.TELNET.TIMEOUT_SEND,
			irs: CONFIG.TELNET.SEPARATOR_INPUT,
			ors: CONFIG.TELNET.SEPARATOR_OUTPUT,
			pageSeparator: CONFIG.TELNET.SEPARATOR_PAGE,
			echoLines: CONFIG.TELNET.ECHO_LINES,
			stripShellPrompt: true,
			negotiationMandatory: true,
			debug: CONFIG.TELNET.DEBUG
		}

		if (CONFIG.BOT.TUNNEL_ENABLED) {
			console.log('[Telnet] ! Tunnel Enabled')

			// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
			tunnel_telnet = tunnel({
				username: CONFIG.SSH.USERNAME,
				password: CONFIG.SSH.PASSWORD,
				host: CONFIG.SERVER.HOST,
				port: CONFIG.SERVER.SSH_PORT,
				dstPort: CONFIG.SERVER.TELNET_PORT,
				localHost: CONFIG.TUNNEL.LOCALHOST,
				localPort: CONFIG.TUNNEL.TELNET_PORT,
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

if (CONFIG.BOT.AI_ENABLED) {
	// noinspection JSUnusedLocalSymbols, JSCheckFunctionSignatures
	bot.loadDirectory(`./src/${CONFIG.AI.CONTENT_DIR}`).then(() => {
		bot.sortReplies()

		console.log('Content loaded!')

		if (CONFIG.BOT.INTERACTIVE_ENABLED) {
			io.setPrompt(`[${CONFIG.BOT.USER_NAME}] `)
			io.prompt()

			io.on('line', command => {
				if (command === '/quit') {
					// noinspection JSUnresolvedVariable
					process.exit(0)
				} else {
					bot.reply(CONFIG.BOT.USER_NAME, command).then(reply => {
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
		}
	}).catch((error, filename, lineno) => {
		console.log('Error when loading files: ' + error)
	})
}

if (CONFIG.BOT.INTERACTIVE_ENABLED && !CONFIG.BOT.AI_ENABLED && !CONFIG.BOT.TELNET_ENABLED) {
	// noinspection JSUnusedLocalSymbols
	io.on('line', command => {
		console.log('[Engine] AI and Telnet is disabled, nobody here to respond...')
	}).on('close', () => {
		// noinspection JSUnresolvedVariable
		process.exit(0)
	})
}

if (CONFIG.BOT.DISCORD_ENABLED) {
	// noinspection JSCheckFunctionSignatures
	discord = new Client({
		presence: {
			activity: {
				type: CONFIG.BOT.BOT_ACTIVITY_TYPE,
				name: CONFIG.BOT.BOT_ACTIVITY_NAME
			}
		}
	})
	discord.commands = new Collection()

	const cooldowns = new Collection()
	const commandFiles = fs.readdirSync(`./src/${CONFIG.DISCORD.COMMANDS_DIR}`).filter(file => file.endsWith('.js'))

	for (const file of commandFiles) {
		// noinspection JSUnresolvedFunction
		const command = require(`./${CONFIG.DISCORD.COMMANDS_DIR}/${file}`)
		discord.commands.set(command.name, command)
	}

	discord.on('ready', () => {
		console.log(`Logged in as ${discord.user.tag}!`)
	})

	discord.on('message', message => {
		let isCommandChannel = CONFIG.DISCORD.COMMANDS_CHANNEL !== '' ? CONFIG.DISCORD.COMMANDS_CHANNEL === message.channel.id : true;
		let isBotMentioned = message.mentions.users.find(user => user.id === CONFIG.DISCORD.BOT_ID) !== undefined
		let isMessageFromBot = message.author.bot

		if (!isMessageFromBot && isCommandChannel && message.content.startsWith(CONFIG.DISCORD.COMMANDS_DISCORD_PREFIX) && message.content.length > 1) {
			const args = message.content.slice(CONFIG.DISCORD.COMMANDS_DISCORD_PREFIX.length).trim().split(/ +/)
			const commandName = args.shift().toLowerCase()
			const command = discord.commands.get(commandName) || discord.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

			if (command) {
				// noinspection JSUnresolvedVariable
				if (command.guildOnly && message.channel.type === 'dm') {
					return message.reply('I can\'t execute that command inside DMs!')
				}

				if (command.args && !args.length) {
					let reply = `You didn't provide any arguments, ${message.author}!`

					if (command.usage) {
						reply += `\nThe proper usage would be: \`${CONFIG.DISCORD.COMMANDS_DISCORD_PREFIX}${command.name} ${command.usage}\``
					}

					// noinspection JSUnresolvedFunction
					return message.channel.send(reply)
				}

				if (!cooldowns.has(command.name)) {
					cooldowns.set(command.name, new Collection())
				}

				const now = Date.now()
				const timestamps = cooldowns.get(command.name)
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
		} else if (!isMessageFromBot && isCommandChannel && message.content.startsWith(CONFIG.DISCORD.COMMANDS_SERVER_PREFIX) && message.content.length > 1) {
			if (CONFIG.BOT.TELNET_ENABLED && telnet) {
				let hasAccess = message.member.roles.cache.some(role => {
					return [
						CONFIG.DISCORD.ROLE_OWNER,
						CONFIG.DISCORD.ROLE_ADMIN,
						CONFIG.DISCORD.ROLE_CORE_DEVELOPER,
						CONFIG.DISCORD.ROLE_DEVELOPER,
						CONFIG.DISCORD.ROLE_TRIAL_DEVELOPER,
						CONFIG.DISCORD.ROLE_HEAD_GAME_MASTER,
						CONFIG.DISCORD.ROLE_TRIAL_GAME_MASTER
					].includes(role.id)
				})

				const command = message.content.substring(1)

				console.log(`[${message.author.id}] ${message.author.username}#${message.author.discriminator}`, command, hasAccess)

				if (hasAccess) {
					if (command !== '') {
						// noinspection JSUnresolvedFunction,DuplicatedCode
						telnet.exec(command, (error, response) => {
							if (error) {
								console.log(`[Telnet] ! ${error}`)
								// noinspection JSUnresolvedFunction
								if (error.toString() !== '')
									message.channel.send(error.toString())
							} else {
								console.log(`[Telnet] < ${response}`)
								if (response !== '') {
									if (response.length > CONFIG.DISCORD.MAX_MESSAGE_LENGTH) {
										let chunks = chunk(response, CONFIG.DISCORD.MAX_MESSAGE_LENGTH)

										chunks.forEach(chunk => {
											// noinspection JSUnresolvedFunction
											message.channel.send(chunk)
										})
									} else {
										// noinspection JSUnresolvedFunction
										message.channel.send(response)
									}
								} else {
									// noinspection JSUnresolvedFunction
									message.channel.send(replyOK())
								}
							}
						})
					}
				} else if (message.member.roles.cache.has(CONFIG.DISCORD.ROLE_COMMUNITY_MANAGER) || message.member.roles.cache.has(CONFIG.DISCORD.ROLE_SERVER_BOOSTER)) {
					if (command.startsWith('revive') || command.startsWith('announce') || command.startsWith('notify')) {
						// noinspection JSUnresolvedFunction,DuplicatedCode
						telnet.exec(command, (error, response) => {
							if (error) {
								console.log(`[Telnet] ! ${error}`)
								// noinspection JSUnresolvedFunction
								message.channel.reply(error)
							} else {
								console.log(`[Telnet] < ${response}`)
								if (response !== '') {
									if (response.length > CONFIG.DISCORD.MAX_MESSAGE_LENGTH) {
										let chunks = chunk(response, CONFIG.DISCORD.MAX_MESSAGE_LENGTH)

										chunks.forEach(chunk => {
											// noinspection JSUnresolvedFunction
											message.channel.send(chunk)
										})
									} else {
										// noinspection JSUnresolvedFunction
										message.channel.send(response)
									}
								} else {
									// noinspection JSUnresolvedFunction
									message.channel.send(replyOK())
								}
							}
						})
					} else {
						// noinspection JSIgnoredPromiseFromCall
						message.reply('You must be a GM to run other server commands...')
					}
				} else {
					// noinspection JSIgnoredPromiseFromCall
					message.reply('You must be a GM or Server Booster to run server commands...')
				}
			} else {
				// noinspection JSIgnoredPromiseFromCall
				message.reply('Telnet is not connected, try again later...')
			}
		} else if (!isMessageFromBot && isBotMentioned) {
			if (CONFIG.BOT.AI_ENABLED && bot) {
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

	// noinspection JSIgnoredPromiseFromCall
	discord.login(CONFIG.DISCORD.BOT_TOKEN)
}