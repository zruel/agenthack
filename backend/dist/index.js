import http from 'http';
import { createApp } from './app.js';
import { cfg, ensurePathsExist } from './config.js';
// Background processors are temporarily disabled until their modules are added.
ensurePathsExist();
const app = createApp();
const server = http.createServer(app);
server.listen(cfg.port, () => {
    console.log(`API listening on http://localhost:${cfg.port}`);
    // startQueueProcessor();
    // startSlaEscalator();
    // startPolicyWatcher();
    // startYearEndRollover();
});
