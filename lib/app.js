import http from "http";
import path from "path";

import express from "express";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";

import { logger } from "./config";

import Storage from "./storage";
import Orgchart from "./orgchart";

class App {
  constructor(cfg) {
    this.port = cfg.port;
    this.basePath = cfg.basePath;
    this.shutdownTimeout = cfg.shutdownTimeout;
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(fileUpload());
  }

  _base(_path) {
    return path.join(this.basePath, _path);
  }

  async init(cfg) {
    logger.info(`using basePath: ${this.basePath}`);
    const storage = await new Storage(cfg).init();
    const orgchart = await new Orgchart(storage).init();

    this.app.get("/healthz", (_, res) => res.end());
    this.app.get(this._base("/orgchart"), orgchart.createFullOrgchartHandler());
    this.app.get(
      this._base("/orgchart/related/:username"),
      orgchart.createRelatedHandler()
    );
    this.app.get(
      this._base("/orgchart/directs/:dinoId"),
      orgchart.createDirectsHandler()
    );
    this.app.get(
      this._base("/orgchart/trace/:username"),
      orgchart.createTraceHandler()
    );
    this.app.get(
      this._base("/orgchart/expanded/:dinoId"),
      orgchart.createExpandedHandler()
    );
    this.app.post(
      this._base("/orgchart/update"),
      orgchart.createUpdateHandler()
    );
    this.app.post(
      this._base("/orgchart/delete/:dinoId"),
      orgchart.createDeleteHandler()
    );
    this.app.post(
      this._base("/orgchart/recreate"),
      orgchart.createRecreateHandler()
    );
    this.app.post(this._base("/orgchart/bulk"), orgchart.createBulkHandler());
  }

  run() {
    this.server = http.createServer(this.app);
    return this.server.listen(this.port);
  }

  stop() {
    let timer;
    const killer = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("timed out closing http server")),
        this.shutdownTimeout
      );
    });
    const close = new Promise((resolve) =>
      this.server.close(() => {
        clearTimeout(timer);
        resolve();
      })
    );
    return Promise.race([close, killer]);
  }
}

export { App as default };
