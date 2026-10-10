import app from './app.js'; import { config } from './config.js';
app.listen(config.port,()=>console.log(`M-DAIRY API listening on ${config.port}`));
