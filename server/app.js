const express = require('express');
const config = require('./config/env');
const apiRouter = require('./routes');

function createApp() {
    const app = express();

    app.use(express.json({ limit: '5mb' }));

    app.use('/api', apiRouter);

    // Собранный фронтенд (client/dist). В разработке его заменяет Vite dev-сервер.
    app.use(express.static(config.staticDir));

    return app;
}

module.exports = { createApp };
