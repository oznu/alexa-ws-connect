import * as crypto from 'crypto';
import * as util from 'util';
import { DynamoDB, config as AWSConfig } from 'aws-sdk';

const randomBytes = util.promisify(crypto.randomBytes);

AWSConfig.update({
  region: 'us-west-2'
});

export interface Client {
  clientId: string;
  accessToken: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  tokenExpires?: string;
}

class Db {
  docClient = new DynamoDB.DocumentClient();
  clientTable = 'alexa-iot-clients';

  /**
   * Register a new client in DynamoDB
   */
  addClient(client: Client): Promise<Client> {
    return this.docClient.put({
      TableName: this.clientTable,
      Item: client
    })
    .promise()
    .then(() => {
      return client;
    });
  }

  /**
   * Updates an existing clients oauth access token and expiry
   */
  updateClientOauthAccessToken(client: Client) {
    return this.docClient.update({
      TableName: this.clientTable,
      Key: {
        clientId: client.clientId
      },
      UpdateExpression: 'set oauthAccessToken = :o, oauthRefreshToken = :r, tokenExpires = :e',
      ExpressionAttributeValues: {
        ':r': client.oauthRefreshToken,
        ':o': client.oauthAccessToken,
        ':e': client.tokenExpires
      }
    })
    .promise();
  }

  /**
   * Retrive the client from DynamoDB
   */
  getClient(clientId): Promise<Client | null> {
    return this.docClient.get({
      TableName: this.clientTable,
      Key: {
        clientId: clientId
      }
    })
    .promise()
    .then((result: any) => {
      if (result.Item) {
        return <Client>result.Item;
      } else {
        return null;
      }
    });
  }

  async getClientAndVerify(clientId, accessToken): Promise<Client | null> {
    const client = await this.getClient(clientId);

    if (client.accessToken === accessToken) {
      return client;
    } else {
      return null;
    }
  }

  async generateRandomAccessToken(): Promise<string> {
    const accessToken = await randomBytes(32);
    return accessToken.toString('hex');
  }

}

export const db = new Db();
