const EVENT_PREFIX = 'yakapa'
const STORE = `${EVENT_PREFIX}/store`
const READY = `${EVENT_PREFIX}/ready`
const CONFIGURED = `${EVENT_PREFIX}/configured`
const STORED = `${EVENT_PREFIX}/stored`
const STREAM = `${EVENT_PREFIX}/stream`
const STREAMED = `${EVENT_PREFIX}/streamed`
const AGENT_DISCONNECTED = `${EVENT_PREFIX}/agentDisconnected`
const AGENT_CONNECTED = `${EVENT_PREFIX}/agentConnected`

export default {
  STORE,
  STORED,
  STREAM,
  STREAMED,
  READY,
  CONFIGURED,
  AGENT_DISCONNECTED,
  AGENT_CONNECTED
}