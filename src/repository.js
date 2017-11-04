import { Lokka } from 'lokka'
import { Transport } from 'lokka-transport-http'

const client = new Lokka({
  transport: new Transport('https://api.graph.cool/simple/v1/cixri1w220iji0121r8lr0n69')
})

const findAgentByTag = (tag) => {  
  return client.query(`
  query findAgentByTag($tag: String!) {
    Agent(tag: $tag) { 
      id
      tag
      nickname
      endUser {
        email
      }
    }
    User(tag: $tag) {
      id
    }
  }`, { tag })
}


const findEndUserByEmailAndAgentTag = (email, tag) => {  
  return client.query(`
  query ($email: String!, $tag: String!) {
    EndUser(email: $email) {
      id
      agents(filter: {tag: $tag}) {
        id
        nickname      
      }
    }
  }`, { tag, email })
}

const createAgent = (tag, nickname, endUserId) => {
  return client.mutate(`
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
  return client.mutate(`
  {
   updatedAgent: updateAgent(id: "${id}", nickname: "${nickname}") {
      id
      updatedAt    
      nickname
    }
  }`)
}

export default {
  findAgentByTag,
  findEndUserByEmailAndAgentTag,
  createAgent,
  updateAgent
}