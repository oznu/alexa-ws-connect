import 'source-map-support/register';

import * as http from 'http';
import app from './app';
import wss from './wss';
import { alexa } from './alexa';

class Core {
  private server;
  public wss: wss;

  constructor() {
    this.server = http.createServer(app);
    this.wss = new wss(this.server);
    this.server.listen(8080);
  }
}

export const core = new Core();
