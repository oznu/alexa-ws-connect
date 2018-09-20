import * as express from 'express';
import * as cors from 'cors';
import * as path from 'path';
import * as helmet from 'helmet';
import * as bodyParser from 'body-parser';

import { core } from './index';
import { alexa } from './alexa';
import apiRouter from './api/routes';

// Create Express server
const app = express();

const serveSpa = (req, res, next) => {
  res.sendFile(path.resolve(__dirname, 'static/index.html'));
};

// set some headers to help secure the app
app.use(helmet({
  hsts: false,
  frameguard: true,
  referrerPolicy: true,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      frameSrc: ['https://api-cdn.amazon.com'],
      scriptSrc: [`'self'`, 'https://api-cdn.amazon.com/sdk/login1.js'],
      styleSrc: [`'self'`, `'unsafe-inline'`],
      imgSrc: [`'self'`, 'https://images-na.ssl-images-amazon.com'],
      workerSrc: [`'none'`],
      connectSrc: [`'self'`, 'https://api.amazon.com', (req) => {
        return `wss://${req.headers.host} ws://${req.headers.host} ${this.cspWsOveride}`;
      }],
    }
  }
}));

app.use(bodyParser.json());

// lambda entry point
app.post('/lambda', alexa.verifyRequest, (req, res, next) => {
  alexa.messageRouter(req, res);
});

// spa entry point
app.get('/', serveSpa);

// static assets
app.use(express.static(path.resolve(__dirname, 'static')));

// enable cors for development using ng serve
app.use(cors({
  origin: ['http://localhost:4200'],
  credentials: true
}));

app.use('/api', apiRouter);

// serve index.html for anything not on the /api routes
app.get(/^((?!api\/).)*$/, serveSpa);

app.use((err, req, res, next) => {
  if (res.statusCode === 200) {
    res.status(500);
  }

  if (res.statusCode === 500) {
    console.error(err);
    return res.json({
      error: 'Internal Server Error',
      message: 'Internal Server Error'
    });
  } else {
    return res.json({
      error: err,
      message: err.message
    });
  }

});

export default app;
