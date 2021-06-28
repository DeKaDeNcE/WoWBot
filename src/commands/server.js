// noinspection JSUnresolvedFunction
const check = require('../functions/check')
// noinspection JSUnresolvedFunction
const CONFIG = require('../config.json')
// noinspection JSUnresolvedFunction
const { MessageEmbed } = require('discord.js');

// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
module.exports = {
	name: 'server',
	description: 'Server information',
	cooldown: 5,
	execute: async (message, args) => {
		let auth_status = await check({
			host: CONFIG.AUTH_SERVER.HOST,
			port: CONFIG.AUTH_SERVER.PORT
		})

		let realm_status = await check({
			host: CONFIG.REALM_SERVERS[0].HOST,
			port: CONFIG.REALM_SERVERS[0].PORT
		})

		let response = [{
			name: 'Auth Server',
			value: auth_status ? '✅ Online' : '❌ Offline'
		} , {
			name: 'Realm Server',
			value: realm_status ? '✅ Online' : '❌ Offline'
		}]

		if (realm_status && CONFIG.COMMANDS.SERVER.SHOW_ONLINE_PLAYERS) {
			response = [{
				name: 'Auth Server',
				value: auth_status ? '✅ Online' : '❌ Offline'
			} , {
				name: 'Realm Server',
				value: realm_status ? '✅ Online' : '❌ Offline'
			} , {
				name: 'Players',
				value: 0
			}]
		}

		// noinspection JSCheckFunctionSignatures
		const status = new MessageEmbed().setColor('#0099ff').setTitle('Server status').addFields(response).setTimestamp()

		message.channel.send(status)
	}
}