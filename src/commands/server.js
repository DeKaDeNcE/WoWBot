// noinspection JSUnresolvedFunction
const check = require('../functions/check')
// noinspection JSUnresolvedFunction
const config = require('../config.json')
// noinspection JSUnresolvedFunction
const { MessageEmbed } = require('discord.js');

// noinspection JSUnresolvedVariable
module.exports = {
	name: 'server',
	description: 'Server information',
	cooldown: 5,
	execute: async (message, args) => {
		let auth_status = await check({
			host: config.SERVER.HOST,
			port: config.SERVER.AUTH_PORT
		})

		let realm_status = await check({
			host: config.SERVER.HOST,
			port: config.SERVER.REALM_PORT
		})

		// noinspection JSCheckFunctionSignatures
		const status = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Server status')
			.addFields({
				name: 'Auth Server',
				value: auth_status ? 'Online' : 'Offline'
			} , {
				name: 'Realm Server',
				value: realm_status ? 'Online' : 'Offline'
			}).setTimestamp()

		message.channel.send(status)
	}
}