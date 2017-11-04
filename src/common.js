const now = () => {
	return new Date().toJSON().slice(0,19).replace(/T/g,' ')
}

const toJson = (json) => {
		return typeof json === 'object' ? json : JSON.parse(json)
	}

export default {
  now,
	toJson
}
