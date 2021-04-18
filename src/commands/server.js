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
			host: CONFIG.SERVER.HOST,
			port: CONFIG.SERVER.AUTH_PORT
		})

		let realm_status = await check({
			host: CONFIG.SERVER.HOST,
			port: CONFIG.SERVER.REALM_PORT
		})

		let response = [{
			name: 'Auth Server',
			value: auth_status ? 'Online' : 'Offline'
		} , {
			name: 'Realm Server',
			value: realm_status ? 'Online' : 'Offline'
		}]

		if (realm_status && CONFIG.COMMANDS.SHOW_ONLINE_PLAYERS) {
			response = [{
				name: 'Auth Server',
				value: auth_status ? 'Online' : 'Offline'
			} , {
				name: 'Realm Server',
				value: realm_status ? 'Online' : 'Offline'
			} , {
				name: 'Players',
				value: 0
			}]
		}

		// noinspection JSCheckFunctionSignatures
		const status = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Server status')
			.addFields(response).setTimestamp()

		message.channel.send(status)
	}
}