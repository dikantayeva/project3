const authService = require('../services/auth.service');

// POST /api/login
async function login(req, res) {
    const { username, password } = req.body;

    try {
        const user = await authService.findUserByUsername(username);

        if (!user || !authService.isPasswordValid(user, password)) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }

        res.json({
            success: true,
            role: user.role,
            username: user.username,
            message: 'Успешный вход'
        });
    } catch (err) {
        console.error('Ошибка при входе в базе данных:', err);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
}

module.exports = { login };
