const monitoringService = require('../services/monitoring.service');

// GET /api/objects?date=...
// Дата среза необязательна — та же дата, что выбрана в календаре на фронтенде.
async function getObjects(req, res) {
    try {
        const rows = await monitoringService.getObjectsWithAverages(req.query.date);
        console.log('ОТВЕТ ДЛЯ КАРТЫ:', rows);
        res.json(rows);
    } catch (err) {
        console.error('ОШИБКА КАРТЫ:', err.message);
        res.status(500).json({ error: err.message });
    }
}

// GET /api/object-details/:objectId?date=...  — данные для графика "Профиль по глубине"
async function getObjectDetails(req, res) {
    const { objectId } = req.params;

    try {
        const rows = await monitoringService.getObjectReadings(objectId, req.query.date);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении данных объекта:', err);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
}

// GET /api/sensor-trend/:sensorId?limit=50  — данные для графика "Тренд по времени"
async function getSensorTrend(req, res) {
    const { sensorId } = req.params;
    // Защита от бессмысленно большого запроса с фронтенда
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);

    try {
        const rows = await monitoringService.getSensorTrend(sensorId, limit);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении тренда датчика:', err);
        res.status(500).json({ success: false, message: 'Ошибка сервера при получении тренда' });
    }
}

module.exports = { getObjects, getObjectDetails, getSensorTrend };
