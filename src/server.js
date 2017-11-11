import express from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import io from 'socket.io'
import scn from 'string-capitalize-name'
import faker from 'faker'
import * as LZString from 'lz-string'

import Common from './common'
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
					console.error(`${Common.now()} ${error.message}`)
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
		this.registerPassThroughEvent(Events.RESULT_STORED, socket)
		this.registerStorageEvent(Events.RESULT, socket)
		this.registerRepositoryEvent(Events.CONFIGURED, socket)		
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
		this.socketServer.sockets.in(tag).emit(Events.READY, {
			tag,
			nickname
		}) 
	}

	listen() {
		this.webServer.listen(this.privatePort, () => {
			console.info(Common.now(), `Listening on *:${this.publicPort} --> *:${this.privatePort}`)
		})
	}
	
	registerRepositoryEvent(event, socket) {
		socket.on(event, (message) => {
			const json = Common.toJson(message)
			console.info(`${Common.now()} ${event}`, json)			
			if (event === Events.CONFIGURED) {
				AgentRepository.update(json.from, json.nickname, json.email)
				return			
			}			
		})
	}
	 
	registerPassThroughEvent(event, socket) {
		socket.on(event, (message) => {
			const json = Common.toJson(message)
			console.info(`${Common.now()} ${event}`, json)
			if (json.to) {
				this.socketServer.sockets.in(json.to).emit(event, message)
				return
			} else {
				//Déterminer l'ensemble des user agent visés par ce from
				const decompressed = Common.toJson(LZString.decompressFromUTF16(json.message))
				if (!decompressed.from) {
					console.error(`${Common.now()} ${json.from} doit spécifier un destinataire`)	
					return
				}
				const from = decompressed.from
				return
			}
			console.error(`${Common.now()} ${json.from} doit spécifier un destinataire`)
		})
	}
	
	registerStorageEvent(event, socket) {
		socket.on(event, (message) => {
			const json = Common.toJson(message)
			console.info(`${Common.now()} ${event}`, json)			
			this.socketServer.sockets.in(AgentRepository.STORAGE_AGENT_TAG).emit(event, message)			
		})
	}

}