const config = require('./config/env');
const { checkConnection } = require('./db/pool');
const { createApp } = require('./app');

checkConnection();

createApp().listen(config.port, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${config.port}`);
});
