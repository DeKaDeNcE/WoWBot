// noinspection JSUnresolvedVariable
module.exports = {
	name: 'server',
	description: 'Ping!',
	cooldown: 5,
	execute: async (message, args) => {
		let status = await check()

		message.channel.send('Server is ' + (status ? 'online' : 'offline'))
	}
}