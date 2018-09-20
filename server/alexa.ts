import * as uuidv4 from 'uuid/v4';
import * as rp from 'request-promise';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';

import { db, Client } from './db';
import { core } from './index';

class Alexa {

  /**
   * Verify the incoming request is from lambda
   * @param req express request object
   * @param res express response object
   */
  public async verifyRequest(req, res, next) {
    if (req.headers['x-alexa-jwt']) {
      return jwt.verify(req.headers['x-alexa-jwt'], process.env.ALEXA_JWT_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          console.log(err);
          return res.sendStatus(401);
        }

        // user is not provided in Alexa.Authorization requests
        if ((decoded.user && decoded.user.user_id) || req.body.request.directive.header.namespace === 'Alexa.Authorization') {
          req.user = decoded.user;
          return next();
        } else {
          return res.sendStatus(401);
        }
      });
    } else {
      return res.sendStatus(401);
    }
  }

  /**
   * Route incoming messages from Alexa
   * @param req express request object
   * @param res express response object
   */
  public messageRouter(req, res) {

    let namespace;

    try {
      namespace = req.body.request.directive.header.namespace;
    } catch (e) {
      console.log(`400 - No Namespace Sent`);
      return res.sendStatus(400);
    }

    switch (namespace) {
      case 'Alexa.Authorization':
        this.handleAuthorization(req, res);
        break;
      case 'Alexa.Discovery':
        this.handleDiscovery(req, res);
        break;
      default:
        this.handleDefault(req, res);
        break;
    }
  }

  /**
   * Handle Alexa Authorization Requests
   * @param req express request object
   * @param res express response object
   */
  private async handleAuthorization(req, res) {
    console.log(JSON.stringify(req.body, null, 4));

    // generate oauth tokens
    const auth = await rp.post('https://api.amazon.com/auth/o2/token', {
      form: {
        grant_type: 'authorization_code',
        code: req.body.request.directive.payload.grant.code,
        client_id: process.env.ALEXA_SKILL_MESSAGING_CLIENT_ID,
        client_secret: process.env.ALEXA_SKILL_MESSAGING_CLIENT_SECRET
      },
      json: true
    });

    // get user id
    const user = await rp.get('https://api.amazon.com/user/profile', {
      auth: {
        bearer: req.body.request.directive.payload.grantee.token
      },
      json: true
    });

    // check if client exists
    const client = await db.getClient(user.user_id);

    if (client) {
      // update existing client
      client.oauthAccessToken = auth.access_token;
      client.oauthRefreshToken = auth.refresh_token;
      client.tokenExpires = moment().add(auth.expires_in, 'seconds').toDate().toISOString();
      await db.updateClientOauthAccessToken(client);
    } else {
      // add client details to database
      await db.addClient({
        clientId: user.user_id,
        accessToken: await db.generateRandomAccessToken(),
        oauthAccessToken: auth.access_token,
        oauthRefreshToken: auth.refresh_token,
        tokenExpires: moment().add(auth.expires_in, 'seconds').toDate().toISOString()
      });
    }

    // send response
    res.json({
      event: {
        header: {
          messageId: req.body.request.directive.header.messageId + 'r',
          namespace: 'Alexa.Authorization',
          name: 'AcceptGrant.Response',
          payloadVersion: '3'
        },
        payload: {}
      }
    });
  }

  /**
   * Alexa Device Discovery Handler
   * @param req express request object
   * @param res express response object
   */
  private handleDiscovery(req, res) {
    const requestId = uuidv4();
    req.body.request.requestId = requestId;
    req.body.request.requestTime = new Date().toISOString();

    console.log(requestId, ':: Incoming Discovery Request:', '\n' + JSON.stringify(req.body, null, 4));

    core.wss.sendToClient(req.user.user_id, req.body.request);

    const endpoints = [];

    setTimeout(() => {
      core.wss.removeAllListeners(requestId);

      const response = {
        event: {
          header: {
            namespace: 'Alexa.Discovery',
            name: 'Discover.Response',
            payloadVersion: '3',
            messageId: req.body.request.directive.header.messageId + 'r',
          },
          payload: {
            endpoints: endpoints
          }
        },
      };

      console.log(requestId, ':: Disovery Finished, Sending Response:', '\n' + JSON.stringify(response, null, 4));

      res.json(response);
    }, 2000);

    core.wss.on(requestId, (response) => {
      if (response) {
        endpoints.push(response);
      }
    });
  }

  /**
   * Default Alexa Handler
   * @param req express request object
   * @param res express response object
   */
  private handleDefault(req, res) {
    const requestId = uuidv4();
    req.body.request.requestId = requestId;
    req.body.request.requestTime = new Date().toISOString();

    console.log(requestId, ':: Incoming Request:', '\n' + JSON.stringify(req.body, null, 4));

    core.wss.sendToDevice(req.user.user_id, req.body.request.directive.endpoint.endpointId, req.body.request);

    const timeoutHandler = setTimeout(() => {
      console.log(requestId, ':: Timeout');
      core.wss.removeAllListeners(requestId);
      res.sendStatus(503);
    }, 5000);

    core.wss.once(requestId, (response) => {
      clearTimeout(timeoutHandler);
      console.log(requestId, ':: Sending Response:', '\n' + JSON.stringify(response, null, 4));
      res.json(response);
    });
  }

  /**
   * Refresh the alexa gateway token if it has expired
   * @param client
   */
  private async refreshAlexaGatewayToken(client: Client) {
    // check if access token is still valid
    const now = moment();
    const expiryTime = moment(client.tokenExpires);
    const diff = moment.duration(expiryTime.diff(now)).as('seconds');

    // if the token is expired, or is going to expire in less than 2 minutes, generate another one
    if (diff < 120) {
      console.log(client.clientId, ':: Refreshing Token');
      const auth = await rp.post('https://api.amazon.com/auth/o2/token', {
        form: {
          grant_type: 'refresh_token',
          refresh_token: client.oauthRefreshToken,
          client_id: process.env.ALEXA_SKILL_MESSAGING_CLIENT_ID,
          client_secret: process.env.ALEXA_SKILL_MESSAGING_CLIENT_SECRET
        },
        json: true
      });

      client.oauthAccessToken = auth.access_token;
      client.tokenExpires = moment().add(auth.expires_in, 'seconds').toDate().toISOString();

      await db.updateClientOauthAccessToken(client);
    }
  }

  /**
   * Handle events sent from a device to the alexa gateway
   */
  public async handleDeviceEvent(clientId, accessToken, deviceId, payload) {
    const client = await db.getClientAndVerify(clientId, accessToken);

    if (!client) {
      console.log(clientId, ':: Client Not Found');
      return;
    }

    if (!client.oauthAccessToken) {
      console.log(clientId, ':: Skill Not Linked Yet');
      return;
    }

    // ensure access token is still valid
    await this.refreshAlexaGatewayToken(client);

    // transform payload
    if (!payload.event.header.messageId) {
      payload.event.header.messageId = uuidv4();
    }

    // set these requires values so the device does not have to
    payload.event.endpoint = {
      endpointId: deviceId,
      scope: {
        type: 'BearerToken',
        token: client.oauthAccessToken
      }
    };

    console.log(clientId, ':: Outgoing Request:', '\n' + JSON.stringify(payload, null, 4));

    // send request to alexa gateway
    const alexaGatewayResponse = await rp.post(process.env.ALEXA_SKILL_EVENT_GATEWAY, {
      auth: {
        bearer: client.oauthAccessToken
      },
      json: payload,
      resolveWithFullResponse: true
    });

    console.log(clientId, ':: Outgoing Request ::', alexaGatewayResponse.statusCode);
  }

}

export const alexa = new Alexa();
