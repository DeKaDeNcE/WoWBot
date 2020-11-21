// noinspection JSUnresolvedFunction
const fs = require('fs')
// noinspection JSUnresolvedFunction
const tunnel = require('tunnel-ssh')
// noinspection JSUnresolvedFunction
const mysql = require('mysql')
// noinspection JSUnresolvedFunction
const { Client, MessageEmbed, Collection } = require('discord.js')
// noinspection JSUnresolvedFunction
const configDiscord = require('./config/discord.json')
// noinspection JSUnresolvedFunction
const configMySQL = require('./config/mysql_local.json')
// noinspection JSUnresolvedFunction
const configSSH = require('./config/ssh.json')

/*const connectionMySQL = mysql.createConnection(configMySQL)

const connectionSSH = tunnel(configSSH, (error, server) => {
	if (error) {
		console.log(error)
	} else {
		connectionMySQL.connect()

		connectionMySQL.query(`SELECT * FROM ${configMySQL.database_auth}.realmlist`, (error, results, fields) => {
			if (error) {
				console.log(error)
			} else {
				// noinspection JSUnresolvedVariable
				console.log('The solution is: ', results)
			}

			connectionMySQL.end()
			// noinspection JSUnresolvedFunction
			connectionSSH.close()
		})
	}
})*/

// noinspection JSUnresolvedFunction
const clientDiscord = new Client()
clientDiscord.commands = new Collection()
const cooldowns = new Collection()

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	// noinspection JSUnresolvedFunction
	const command = require(`./commands/${file}`)
	clientDiscord.commands.set(command.name, command)
}

clientDiscord.on('ready', () => {
	console.log(`Logged in as ${clientDiscord.user.tag}!`)
})

clientDiscord.on('message', message => {
	if (message.author.bot) return

	const args = message.content.slice(configDiscord.PREFIX.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase()

	// noinspection JSUnresolvedVariable
	const command = clientDiscord.commands.get(commandName) || clientDiscord.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

	if (!command) return

	// noinspection JSUnresolvedVariable
	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!')
	}

	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${configDiscord.PREFIX}${command.name} ${command.usage}\``
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
});

// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall
clientDiscord.login(configDiscord.BOT_TOKEN)