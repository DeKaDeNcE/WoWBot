// noinspection JSUnresolvedFunction
const hostname		= require('os').hostname()
// noinspection JSUnresolvedFunction
const child_process	= require('child_process')

const containerized = callback => {
	const determine = data => {
		return data.match(new RegExp('[0-9]+\:[a-z_-]+\:(\/docker-ce)?\/docker\/' + hostname + '[0-9a-z]+', 'i')) !== null
	}

	let err, result = null, cgroups = '', cmd = 'cat /proc/self/cgroup'

	if (typeof child_process.execSync === 'function') {
		// sync (node > 0.10.x)
		try {
			cgroups = child_process.execSync(cmd, {
				stdio: ['pipe', 'pipe', 'ignore']
			})
		} catch (e) {
			err = e
		}

		//noinspection JSCheckFunctionSignatures
		result = !!determine(cgroups.toString('utf8'))

		if (typeof callback === 'function') {
			callback(err, result)
		}
	} else {
		// async (node <= 0.10.x)
		child_process.exec(cmd, {
			stdio: ['pipe', 'pipe', 'ignore']
		}, (err, data) => {
			result = !!determine(data)

			if (typeof callback === 'function') {
				callback(err, result)
			}

			return result
		})
	}

	return result
}

// noinspection JSUnresolvedVariable
module.exports = containerized