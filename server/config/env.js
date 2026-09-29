require('dotenv').config();
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

// Если есть целая строка DATABASE_URL, используем её, иначе собираем из кусочков
const connectionString =
    databaseUrl ||
    `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Для localhost SSL не нужен, для удалённой базы — включаем
const isLocalDb =
    (databaseUrl && databaseUrl.includes('localhost')) || process.env.DB_HOST === 'localhost';

module.exports = {
    port: process.env.PORT || 3000,

    db: {
        connectionString,
        ssl: isLocalDb ? false : { rejectUnauthorized: false },
        // Все подключения из пула работают в часовом поясе Алматы
        // (см. комментарий в db/pool.js)
        timeZone: 'Asia/Almaty'
    },

    // Откуда Express раздаёт собранный фронтенд (npm run build:client).
    // В разработке фронтенд раздаёт Vite (порт 5173), этот путь не используется.
    staticDir: process.env.STATIC_DIR || path.resolve(__dirname, '../../client/dist')
};
