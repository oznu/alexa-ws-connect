import * as url from 'url';
import * as querystring from 'querystring';
import * as EventEmitter from 'events';
import * as crypto from 'crypto';
import { Server } from 'ws';

import { db } from './db';
import { core } from './index';
import { alexa } from './alexa';

export default class Wss extends EventEmitter {
  public wss: Server;

  constructor(server) {
    super();

    this.wss = new Server({
      server: server,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  /**
   * Verify the access id and token before allowing a connection to be established
   */
  private async verifyClient({ req }, callback) {
    const qs = querystring.parse(url.parse(req.url).query);

    console.log(qs);

    // if required query string attributes not present, reject the ws connection
    if (!qs.client_id || !qs.client_token || !qs.device_id) {
      return callback(false);
    }

    const client = await db.getClientAndVerify(qs.client_id, qs.client_token);

    if (client) {
      req.$client = client;
      req.$deviceId = qs.device_id;
    } else {
      return callback(false);
    }

    return callback(true);
  }

  /**
   * Handles the initial connection of the device
   */
  private handleConnection(ws, req) {
    console.log('Connections Established From:', req.connection.remoteAddress);

    const clientId = req.$client.clientId;
    const deviceId = req.$deviceId;

    const clientListenerName = this.getClientListener(clientId);
    const deviceListenerName = this.getDeviceListener(clientId, deviceId);

    // send ping every 10 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState = 1) {
        ws.ping('ping', true);
      }
    }, 10000);

    // handle message response from iot device
    ws.on('message', (payload) => {
      console.log('got message');
      let data;

      try {
        data = JSON.parse(payload);
      } catch (e) {
        console.log('Response not valid JSON');
        return;
      }

      if (data.requestId) {
        // message is a response to a request
        this.emit(data.requestId, data.response);
      } else if (data.request && data.request.context && data.request.event) {
        // message is not a response to a request, send to alexa gateway
        alexa.handleDeviceEvent(clientId, req.$client.accessToken, deviceId, data.request);
      }
    });

    // listen for incoming messages from alexa that should be sent to all devices
    const clientEventHandler = (data) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
      }
    };

    // listen for incoming messages from alexa that should be sent to a single device
    const deviceEventHandler = (data) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
      }
    };

    this.on(clientListenerName, clientEventHandler);
    this.on(deviceListenerName, deviceEventHandler);

    // cleanup listeners when iot device disconnects
    ws.on('close', () => {
      clearInterval(pingInterval);
      this.removeListener(clientListenerName, clientEventHandler);
      this.removeListener(deviceListenerName, deviceEventHandler);
    });
  }

  /**
   * Gets the listener name for a client
   * @param clientId
   */
  private getClientListener(clientId: string) {
    return crypto.createHash('sha256').update(`client-${clientId}`).digest('hex');
  }

  /**
   * Gets the listener name for a device
   * @param clientId
   * @param deviceId
   */
  private getDeviceListener(clientId: string, deviceId: string) {
    return crypto.createHash('sha256').update(`client-${clientId}-${deviceId}`).digest('hex');
  }

  /**
   * Send a message to all devices owned by a client
   * @param clientId
   * @param message
   */
  public sendToClient(clientId, message) {
    this.emit(this.getClientListener(clientId), message);
  }

  /**
   * Send a message to a specific device owned by a client
   * @param clientId
   * @param deviceId
   * @param message
   */
  public sendToDevice(clientId, deviceId, message) {
    this.emit(this.getDeviceListener(clientId, deviceId), message);
  }

}
