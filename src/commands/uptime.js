// noinspection JSUnresolvedFunction
const { Client } = require('ssh2')
// noinspection JSUnresolvedFunction
const CONFIG = require('../config.json')
// noinspection JSUnresolvedFunction
const { MessageEmbed } = require('discord.js');

// noinspection JSUnresolvedVariable,JSUnusedLocalSymbols
module.exports = {
	name: 'uptime',
	description: 'Uptime information',
	cooldown: 5,
	execute: async (message, args) => {
		const ssh2 = new Client()

		ssh2.on('ready', () => {
			console.log('[SSH] ! Ready');
			ssh2.exec('uptime', (error, stream) => {
				if (error) {
					console.log(error)
					if (error) {
						message.channel.reply(JSON.stringify(error))
					}
				} else {
					stream.on('close', (code, signal) => {
						console.log(`[SSH] ! Connection closed with ${code} ` + (signal ? `signal ${signal}` : ''))
						ssh2.end()
					}).on('data', data => {
						console.log(`[SSH] < StdOut ${data}`)
						if (data.toString() !== '') {
							message.channel.send(data.toString())
						} else {
							message.channel.reply('SSH is not connected, try again later...')
						}
					}).stderr.on('data', data => {
						console.log(`[SSH] < StdErr ${data}`)
						if (data.toString() !== '') {
							message.channel.send(data.toString())
						} else {
							message.channel.reply('SSH is not connected, try again later...')
						}
					})
				}
			})
		})

		const params = {
			host: CONFIG.SERVER.HOST,
			port: CONFIG.SERVER.SSH_PORT,
			username: CONFIG.SSH.USERNAME,
			password: CONFIG.SSH.PASSWORD
		}

		try {
			ssh2.connect(params)
		} catch (error) {
			console.log(error)
			message.channel.reply(error)
		}
	}
}