import chalk from 'chalk'
import express from 'express'
import expressWs from 'express-ws'
import { v4 } from 'uuid'

export const localWebSocketServer = ({ onConnect, onAuth, onDisconnect }) => {
  const connections = {}
  const wsApp = expressWs(express()).app
  wsApp.use(express.json())
  wsApp.use(express.urlencoded({ extended: true }))

  wsApp.post('/send', (req, res) => {
    const { event, websocketId } = req.body
    connections[websocketId].send(JSON.stringify(event))
    res.status(200).send()
  })

  wsApp.ws('/', function (ws: any, req) {
    ws.id = v4()
    connections[ws.id] = ws
    onConnect(ws.id)
    ws.on('message', function (data) {
      onAuth({
        websocketId: ws.id,
        data,
        send: message => ws.send(JSON.stringify(message)),
      })
    })
    ws.on('close', () => {
      onDisconnect(ws.id)
      delete connections[ws.id]
    })
  })

  console.log(
    `${chalk.bold('Botonic WebSocket API')} listening on port ${chalk.bold(
      process.env.PORT
    )}`
  )
  wsApp.listen(parseInt(process.env.PORT as string))
  return wsApp
}
