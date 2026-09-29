const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({
    connectionString: config.db.connectionString,
    ssl: config.db.ssl
});

// Часовой пояс: сами данные (timestamptz) хранятся корректно в UTC в любом случае,
// но без этого DATE(...) в запросах считает календарный день по UTC, а не по Алматы.
// Из-за разницы в 5 часов показания, снятые ночью/рано утром по времени Алматы,
// "уезжали" на предыдущий UTC-день и не попадали в выборку по нужной дате.
// Переключаем часовой пояс КАЖДОГО подключения из пула на Asia/Almaty,
// чтобы DATE(sr.timestamp) везде считался по алматинскому календарному дню.
pool.on('connect', (client) => {
    client.query(`SET TIME ZONE '${config.db.timeZone}';`).catch((err) => {
        console.error('❌ Не удалось выставить часовой пояс соединения:', err.message);
    });
});

// Проверка подключения при старте
function checkConnection() {
    pool.query('SELECT NOW()', (err) => {
        if (err) console.error('❌ Ошибка базы:', err.message);
        else console.log('✅ База данных подключена успешно!');
    });
}

module.exports = { pool, checkConnection };
