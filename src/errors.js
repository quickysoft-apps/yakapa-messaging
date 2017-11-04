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

class AuthenticationError extends ExtendableError {
	constructor(message) {
		super('Authentication error: ' + message)
		this.data = 'AuthenticationError'
	}
}

export default {
  ServerError,
  AuthenticationError
}