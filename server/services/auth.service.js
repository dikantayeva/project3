const { pool } = require('../db/pool');

async function findUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
}

/**
 * Проверка пароля (для user_guest поле password может быть NULL).
 *
 * ВНИМАНИЕ: пароли пока сравниваются в открытом виде — так было в исходном server.js.
 * Когда дойдём до безопасности, менять нужно только эту функцию (bcrypt.compare).
 */
function isPasswordValid(user, password) {
    if (user.password === password) return true;
    return user.password === null && !password;
}

module.exports = { findUserByUsername, isPasswordValid };
