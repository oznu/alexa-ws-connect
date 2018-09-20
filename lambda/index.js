const r2 = require('r2');
const jwt = require('jsonwebtoken');

// Export Handler
exports.handler = async (request, context) => {
  let user;
  let oauthBearerToken;

  console.log("Request :: ", JSON.stringify((request)));

  switch (request.directive.header.namespace) {
    case 'Alexa.Discovery':
      oauthBearerToken = request.directive.payload.scope.token;
      break;
    case 'Alexa.Authorization':
      oauthBearerToken = null;
      break;
    default:
      oauthBearerToken = request.directive.endpoint.scope.token;
  }


  if (oauthBearerToken) {
    user = await r2.get('https://api.amazon.com/user/profile', {
      headers: {
        'Authorization': `Bearer ${oauthBearerToken}`
      }
    }).json;
  } else {
    user = { user_id: null };
  }

  const contextResponse = await r2.post('https://alexa.iot.oz.nu/lambda', {
    json: {
      request: request
    },
    headers: {
      'x-alexa-jwt': jwt.sign({ user }, process.env.ALEXA_JWT_SECRET_TOKEN, { expiresIn: '5m' })
    }
  }).json;

  console.log("Response :::", JSON.stringify(contextResponse));

  context.succeed(contextResponse);
};