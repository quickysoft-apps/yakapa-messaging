import { GraphQLClient } from 'graphql-request'
import Common from './common'

const STORAGE_AGENT_TAG = 'f1a33ec7-b0a5-4b65-be40-d2a93fd5b133'
const STREAMING_AGENT_TAG = 'ea0d3ee6-ad65-47f4-9ff0-d25d7a18ed97'

const client = new GraphQLClient('https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69');

const findAgentByTag = (tag) => {	
	return client.request(`
  query findAgentByTag($tag: String!) {
    Agent(tag: $tag) { 
      id
      tag
      nickname
      endUser {
        email
				users {
					tag
				}
      }
    }
    User(tag: $tag) {
      id
    }
  }`, {	tag	})
}

const findEndUserByEmailAndAgentTag = (email, tag) => {
	return client.request(`
  query ($email: String!, $tag: String!) {
    EndUser(email: $email) {
      id
      agents(filter: {tag: $tag}) {
        id
        nickname      
      }
    }
  }`, {
		tag,
		email
	})
}

const createAgent = (tag, nickname, endUserId) => {
	return client.request(`
  {
    newAgent: createAgent(tag: "${tag}", nickname: "${nickname}", endUserId: "${endUserId}") {
      id
      updatedAt
      nickname
      endUser {
        email
      }
    }
  }`)
}

const updateAgent = (id, nickname) => {
	return client.request(`
  {
   updatedAgent: updateAgent(id: "${id}", nickname: "${nickname}") {
      id
      updatedAt    
      nickname
    }
  }`)
}

const findByTag = (tag, callback) => {
	if (!tag) {
		callback(null, new ServerError('Cannot find agent with undefined tag'))
	}
	findAgentByTag(tag)
		.then((data) => {
			let system = null
			if (data.Agent) {
				system = {
					nickname: data.Agent.nickname,
					email: data.Agent.endUser.email,
					tag
				}
			}
			if (data.User) {
				system = {
					nickname: 'Yakapa User',
					email: 'n/a',
					tag
				}
			}
			if (tag === STORAGE_AGENT_TAG) {
				system = {
					nickname: 'Yakapa Storage',
					email: 'n/a',
					tag
				}
			}
			if (tag === STREAMING_AGENT_TAG) {
				system = {
					nickname: 'Yakapa Streaming',
					email: 'n/a',
					tag
				}
			}
			if (system) {
				console.info(Common.now(), `Connection ${JSON.stringify(system)}`)
				callback(system, null)
			} else {
				console.warn(Common.now(), `Connection système inconnu ${tag}`)
				callback(null, new AuthenticationError('Système non authorisé'))
			}
		})
		.catch((error) => {
			console.error(`${Common.now()} La découverte du système a échoué`, error)
			callback(null, new ServerError(error.message))
		})
}

const findTargetedUsers = (tag, callback) => {
	if (!tag) {
		callback(null, new ServerError('Cannot find agent with undefined tag'))
	}
	findAgentByTag(tag)
		.then((data) => {			
			const targets = data.Agent.endUser.users
			if (targets) {				
				callback(targets, null)
			}
		})
		.catch((error) => {
			console.error(`${Common.now()} La découverte du utilisateurs cible a échoué`, error)
			callback(null, new ServerError(error.message))
		})
}

const update = (tag, nickname, email) => {
	if (!email) {
		return
	}
	findEndUserByEmailAndAgentTag(email, tag).then((data) => {
		if (!data.EndUser) {
			return console.info(Common.now(), `Email inconnu : ${email}`)
		} else {
			const endUserId = data.EndUser.id
			if (data.EndUser.agents.length > 0) {
				const agent = data.EndUser.agents[0]
				if (agent.nickname !== nickname) {
					updateAgent(agent.id, nickname).then((data) => {
						console.info(Common.now(), `Agent mis à jour : ${data.updatedAgent.nickname}, ${email}`)
					}).catch((error) => {
						console.error(`${Common.now()} updateAgent`, error)
					})
				}
			} else {
				createAgent(tag, nickname, endUserId).then((data) => {
					console.info(Common.now(), `Nouvel agent "${data.newAgent.nickname}" créé pour ${data.newAgent.endUser.email}`)
				}).catch((error) => {
					console.error(`${Common.now()} createAgent`, error)
				})
			}
		}
	}).catch((error) => {
		console.error(`${Common.now()} findEndUserByEmailAndAgentTag`, error)
	})
}


export default {
	STORAGE_AGENT_TAG,
	STREAMING_AGENT_TAG,
	findByTag,
	findTargetedUsers,
	update
}