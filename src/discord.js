// noinspection JSUnresolvedFunction
const fs = require('fs')
// noinspection JSUnresolvedFunction
const { Client, MessageEmbed, Collection } = require('discord.js')
// noinspection JSUnresolvedFunction
const config = require('./config.json')

// noinspection JSUnresolvedFunction
const client = new Client()
client.commands = new Collection()
const cooldowns = new Collection()

// noinspection JSUnresolvedVariable
const commandFiles = fs.readdirSync(`./src/${config.DISCORD.COMMANDS}`).filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	// noinspection JSUnresolvedFunction,JSUnresolvedVariable
	const command = require(`./${config.DISCORD.COMMANDS}/${file}`)
	client.commands.set(command.name, command)
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', message => {
	if (message.author.bot) return

	if (message.content.startsWith(config.DISCORD.COMMANDS_PREFIX)) {
		const args = message.content.slice(config.DISCORD.COMMANDS_PREFIX.length).trim().split(/ +/)
		const commandName = args.shift().toLowerCase()
		// noinspection JSUnresolvedVariable
		const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

		if (command) {
			// noinspection JSUnresolvedVariable
			if (command.guildOnly && message.channel.type === 'dm') {
				return message.reply('I can\'t execute that command inside DMs!')
			}

			if (command.args && !args.length) {
				let reply = `You didn't provide any arguments, ${message.author}!`

				if (command.usage) {
					reply += `\nThe proper usage would be: \`${config.DISCORD.COMMANDS_PREFIX}${command.name} ${command.usage}\``
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
	} else if (message.mentions.users.find(user => user.id === config.DISCORD.BOT_ID)) {
		// noinspection JSUnresolvedFunction
		bot.reply(message.author.id, message.content).then(reply => {
			// noinspection JSUnresolvedFunction,JSCheckFunctionSignatures
			return message.reply(reply)
		}).catch(err => {
			console.error(err)
		})
	}
})

// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall
client.login(config.DISCORD.TOKEN)