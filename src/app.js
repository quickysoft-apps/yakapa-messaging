import express from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import io from 'socket.io'
import scn from 'string-capitalize-name'
import faker from 'faker'

const request = require('request')
const qs = require('qs')

import Events from './events'
import Model from './model'


const DEFAULT_PUBLIC_PORT = 80
const DEFAULT_PRIVATE_PORT = 3000
const DEFAULT_PUBLIC_SSL_PORT = 443
const DEFAULT_PRIVATE_SSL_PORT = 3443
const DEFAULT_HOST = 'http://mprj.cloudapp.net'
const DEFAULT_SSL_HOST = 'https://mprj.cloudapp.net'


const now = () => {
	return new Date().toJSON().slice(0,19).replace(/T/g,' ')
}

class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else { 
      this.stack = (new Error(message)).stack; 
    }
  }
}  

class ServerError extends ExtendableError {
  constructor(message) {
    super(message)
    this.data = 'ServerError'
  }
}

class DiscoverError extends ExtendableError {
  constructor(message) {
    super('Verification error: ' + message)
    this.data = 'DiscoverError'
  }
}

class Server {

  constructor(secure = true) {

    this._secure = secure  
   
    const sslOptions = {
      key: fs.readFileSync('/home/azemour/yakapa/yakapa-cra/socket-server/yakapass.pem'),
      cert: fs.readFileSync('/home/azemour/yakapa/yakapa-cra/socket-server/yakapass.crt')
    }

    this.publicPort = secure ? DEFAULT_PUBLIC_SSL_PORT : DEFAULT_PUBLIC_PORT
    this.privatePort = secure ? DEFAULT_PRIVATE_SSL_PORT : DEFAULT_PRIVATE_PORT
    this.expressApp = express()    
    this.webServer = secure ? https.Server(sslOptions, this.expressApp) : http.Server(this.expressApp)
        
    this.socketServer = io.listen(this.webServer)

    this.handleRequests()

    this.socketServer.sockets.on('connection', (socket) => {
      this.setReady(socket)
      this.registerHandlers(socket)
    })
    
    this.socketServer.use((socket, next) => {      
      const tag = socket.handshake.query.tag
			
      this.discoverAgent(tag, (res, error) => {
        if (error) {
					console.error(`${now()} ${error.message}`)
          next(error)
        } else {
					socket.yakapa = {
						data : {
							knownAgent : res,
							authenticatingTag: tag              
						}
					}
					return next()
        }                   
      })           
    })  
    
  } 
  
  registerHandlers(socket) {
    this.handlePassThrough(Events.CHAT, socket)
    this.handlePassThrough(Events.EXECUTE, socket)
		this.handlePassThrough(Events.RESULT, socket)
		this.handlePassThrough(Events.CONFIGURED, socket)    
  }
  
  discoverAgent(tag, callback) {
    if (!tag) { 
      callback(null, new DiscoverError('undefined tag')) 
    }    
    Model.findAgentByTag(tag)
        .then((data) => {
					let nickname = ''
					let email = ''
          let host = this._secure ? DEFAULT_SSL_HOST : DEFAULT_HOST
          if (data.Agent) {             
            nickname = data.Agent.nickname
						email = data.Agent.endUser.email                        					
            callback(data.Agent, null)
          }
					if (data.User) {             
            nickname = 'Opérateur Yakapa'
						email = 'operator@yakapa.com'
						const agent = { nickname, email, tag }						
            callback(agent, null)
          }		
					if (!data.Agent && !data.User) {
						console.info(now(), `Agent inconnu : ${tag}`)
            callback(null, null)	
					} else { 
						console.info(now(), `Connection ${nickname} (${email})`)	
					}
        })
        .catch((error) => {
          console.error(`${now()} La découverte de l'agent a échoué`, error)
          callback(null, new ServerError(error.message))
        })
  } 
    
  setReady(socket) {  		
		const randomUser = {
			name: {
				first: faker.commerce.productAdjective(),
				last: faker.name.firstName()
			}
		}    
		const generatedNickname = scn(`${randomUser.name.first} ${randomUser.name.last}`, {ignoreLessThanLength: 3})
		const tag = socket.yakapa.data.authenticatingTag
		const knownAgent = socket.yakapa.data.knownAgent
		const nickname = knownAgent ? knownAgent.nickname : generatedNickname
		const host = this._secure ? DEFAULT_SSL_HOST : DEFAULT_HOST    
		socket.join(tag)
		this.socketServer.sockets.in(tag).emit(Events.READY, { tag, nickname })    
  }
	
  listen() {
    this.webServer.listen(this.privatePort, () => {
      console.info(now(), `Listening on *:${this.publicPort} --> *:${this.privatePort}`)
    })    
  } 

  toJson(json) {
    return typeof json === 'object' ? json : JSON.parse(json)
  }

  handleRequests() {
    this.expressApp.use(express.static(path.resolve(__dirname, '..', 'static')))
    this.expressApp.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '..', 'static', 'index.html'))
    })
  }

  handlePassThrough(event, socket) {
    socket.on(event, (message) => {
      const json = this.toJson(message)
      console.info(`${now()} ${event}`, json)
      if (json.to) {
        this.socketServer.sockets.in(json.to).emit(event, message)
				return
      } else {
				if (event === Events.CONFIGURED) {
						this.updateAgent(json.from, json.nickname, json.email)					  						
						return
				}
      }
			console.error(`${now()} ${json.from} doit spécifier un destinataire`)
    })
  }
	
	updateAgent(tag, nickname, email) {
		if (!email) {	
			return
		}
		Model.findEndUserByEmailAndAgentTag(email, tag).then((data) => {
			if (!data.EndUser) {
				return console.info(now(), `Email inconnu : ${email}`)
			} else {
				const endUserId = data.EndUser.id						
				if (data.EndUser.agents.length > 0) {
					const agent = data.EndUser.agents[0]					
					if (agent.nickname !== nickname) {
						Model.updateAgent(agent.id, nickname).then((data) => {
							console.info(now(), `Agent mis à jour : ${data.updatedAgent.nickname}, ${email}`)
						}).catch((error) => {console.error(`${now()} updateAgent`, error)} )									
					}
				} else {
					Model.createAgent(tag, nickname, endUserId).then((data) => {
						console.info(now(), `Nouvel agent "${data.newAgent.nickname}" créé pour ${data.newAgent.endUser.email}`)
					}).catch((error) => {console.error(`${now()} createAgent`, error)} )			
				}
			}
		}).catch((error) => {console.error(`${now()} findEndUserByEmailAndAgentTag`, error)} )
	}
  
}

const server = new Server(true)
server.listen()
