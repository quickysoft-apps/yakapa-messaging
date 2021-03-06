import express from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import io from 'socket.io'
import scn from 'string-capitalize-name'
import faker from 'faker'
import * as LZString from 'lz-string'
import * as Common from 'yakapa-common'

import AgentRepository from './agentRepository'
import Events from './events'
import Errors from './errors'

const DEFAULT_PUBLIC_PORT = 80
const DEFAULT_PRIVATE_PORT = 3000
const DEFAULT_PUBLIC_SSL_PORT = 443
const DEFAULT_PRIVATE_SSL_PORT = 3443
const DEFAULT_HOST = 'http://mprj.cloudapp.net'
const DEFAULT_SSL_HOST = 'https://mprj.cloudapp.net'

export default class Server {

	constructor(secure = true) {

		this._secure = secure

		const sslOptions = {
			key: fs.readFileSync('/home/azemour/yakapa/yakapa-messaging/yakapass.pem'),
			cert: fs.readFileSync('/home/azemour/yakapa/yakapa-messaging/yakapass.crt')
		}

		this.publicPort = secure ? DEFAULT_PUBLIC_SSL_PORT : DEFAULT_PUBLIC_PORT
		this.privatePort = secure ? DEFAULT_PRIVATE_SSL_PORT : DEFAULT_PRIVATE_PORT
		this.expressApp = express()
		this.webServer = secure ? https.Server(sslOptions, this.expressApp) : http.Server(this.expressApp)
		this.socketServer = io.listen(this.webServer)

		this.expressApp.use(express.static(path.resolve(__dirname, '..', 'static')))
		this.expressApp.get('*', (req, res) => {
			res.sendFile(path.resolve(__dirname, '..', 'static', 'index.html'))
		})

		this.socketServer.sockets.on('connection', (socket) => {
			this.setReady(socket)
			this.registerEvents(socket)
		})

		this.socketServer.use((socket, next) => {
			const tag = socket.handshake.query.tag

			AgentRepository.findByTag(tag, (res, error) => {
				if (error) {
					Common.Logger.error(error.message)
					next(error)
				} else {
					socket.yakapa = {
						data: {
							knownAgent: res,
							authenticatingTag: tag
						}
					}
					return next()
				}
			})
		})

	}

	registerEvents(socket) {
		this.registerStorageEvent(Events.STORE, socket)
		this.registerStoredEvent(Events.STORED, socket)
		this.registerStreamingEvent(Events.STREAM, socket)
		this.registerStreamingEvent(Events.STREAMED, socket)
    this.registerRepositoryEvent(Events.CONFIGURED, socket)
    this.registerClientSocketEvent('disconnect', socket)
	}

	setReady(socket) {
		const randomUser = {
			name: {
				first: faker.commerce.productAdjective(),
				last: faker.name.firstName()
			}
		}
		const generatedNickname = scn(`${randomUser.name.first} ${randomUser.name.last}`, {
			ignoreLessThanLength: 3
		})
		const tag = socket.yakapa.data.authenticatingTag
		const knownAgent = socket.yakapa.data.knownAgent
		const nickname = knownAgent ? knownAgent.nickname : generatedNickname
		const host = this._secure ? DEFAULT_SSL_HOST : DEFAULT_HOST
		socket.join(tag)
    this.socketServer.sockets.in(tag).emit(Events.READY, { tag, nickname })
    AgentRepository.findTargetedUsers(tag, (res, error) => {
      if (error) {
        Common.Logger.error(error.message)
      } else {
        res.map(user => {
          this.socketServer.sockets.in(user.tag).emit(Events.AGENT_CONNECTED, tag)
        })
      }
    })      
	}

	listen() {
		this.webServer.listen(this.privatePort, () => {
			Common.Logger.info(`Listening on *:${this.publicPort} --> *:${this.privatePort}`)
		})
	}

	registerRepositoryEvent(event, socket) {
		socket.on(event, (message) => {
			const { from, nickname, email } = Common.Json.from(message)
			Common.Logger.info(event, { from, email })
			if (event === Events.CONFIGURED) {
				AgentRepository.update(from, nickname, email)
				return
			}
		})
	}

	registerPassThroughEvent(event, socket) {
		socket.on(event, (socketMessage) => {
			const { message, from, to, nickname, email } = Common.Json.from(socketMessage)			
			//l'agent destinataire est fixé par "to"
			if (to) {
				Common.Logger.info(event, { from, email, to })
				this.socketServer.sockets.in(to).emit(event, socketMessage)
				return
			}
			Common.Logger.error(`${from} doit spécifier un destinataire`)
		})
  }
  
	registerClientSocketEvent(event, socket) {
		socket.on(event, (socketMessage) => {			      
      const tag = socket.yakapa.data.authenticatingTag      
      Common.Logger.warn(`${tag} est déconnecté`)      
      AgentRepository.findTargetedUsers(tag, (res, error) => {
        if (error) {
          Common.Logger.error(error.message)
        } else {
          res.map(user => {
            this.socketServer.sockets.in(user.tag).emit(Events.AGENT_DISCONNECTED, tag)
          })
        }
      })      
		})
	}

	registerStoredEvent(event, socket) {
		socket.on(event, (socketMessage) => {
			const decompressed = Common.Json.from(LZString.decompressFromUTF16(socketMessage.message))			
			if (decompressed.from) {
				AgentRepository.findTargetedUsers(decompressed.from, (res, error) => {
					if (error) {
						Common.Logger.error(error.message)
					} else {
						res.map(user => {
							this.socketServer.sockets.in(user.tag).emit(event, socketMessage)
						})
					}
				})
			}
		})
	}

	registerStorageEvent(event, socket) {
		socket.on(event, (message) => {
			const { from, nickname, email } = Common.Json.from(message)
			Common.Logger.info(event, { from, email })
			this.socketServer.sockets.in(AgentRepository.STORAGE_AGENT_TAG).emit(event, message)
		})
	}

	registerStreamingEvent(event, socket) {
		socket.on(event, (socketMessage) => {
			const { from, to, nickname, email } = Common.Json.from(socketMessage)
			Common.Logger.info(event, { from, email, to })
			switch (event) {
				case Events.STREAM:
					this.socketServer.sockets.in(AgentRepository.STREAMING_AGENT_TAG).emit(event, socketMessage)
					break
				case Events.STREAMED:
					const decompressed = LZString.decompressFromUTF16(socketMessage.message)
					this.socketServer.sockets.in(to).emit(event, socketMessage)
					break
			}
		})
	}

}