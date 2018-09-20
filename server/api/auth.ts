import * as rp from 'request-promise';
import * as jwt from 'jsonwebtoken';
import { db } from '../db';

class ApiAuth {

  async login(accessToken) {
    // get user id
    const user = await rp.get('https://api.amazon.com/user/profile', {
      auth: {
        bearer: accessToken
      },
      json: true
    });

    // check if client exists in dynamodb
    let client = await db.getClient(user.user_id);

    // create client if they do not exist
    if (!client) {
      client = await db.addClient({
        clientId: user.user_id,
        accessToken: await db.generateRandomAccessToken(),
      });
    }

    return {
      access_token: this.generateJwt(user),
      expires_in: 14400
    };
  }

  generateJwt(payload): Promise<string> {
    return jwt.sign(payload, process.env.JWT_SECRET_TOKEN, {expiresIn: '4h'});
  }

  isAuthedMiddleware(req, res, next) {
    if (req.headers['x-jwt']) {
      return jwt.verify(req.headers['x-jwt'], process.env.JWT_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.sendStatus(401);
        }
        req.user = decoded;
        return next();
      });
    } else {
      return res.sendStatus(401);
    }
  }

  async getAccessProfile(req, res, next) {
    return db.getClient(req.user.user_id)
      .then((client) => {
        res.json({
          clientId: client.clientId,
          accessToken: client.accessToken,
          skillLinked: client.oauthAccessToken ? true : false,
        });
      })
      .catch(next);
  }

}

const apiAuth = new ApiAuth();

export default apiAuth;
