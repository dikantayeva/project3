const { Router } = require('express');

const monitoringController = require('../controllers/monitoring.controller');
const authController = require('../controllers/auth.controller');
const telemetryController = require('../controllers/telemetry.controller');

// Все маршруты монтируются в app.js под префиксом /api.
// Итоговые URL те же, что и в старом server.js — фронтенд менять не нужно.
const router = Router();

// --- Данные для карты и графиков ---
router.get('/objects', monitoringController.getObjects);
router.get('/object-details/:objectId', monitoringController.getObjectDetails);
router.get('/sensor-trend/:sensorId', monitoringController.getSensorTrend);

// --- Авторизация ---
router.post('/login', authController.login);

// --- Приём данных с датчиков ---
router.post('/telemetry', telemetryController.postTelemetry);
router.post('/telemetry/batch', telemetryController.postTelemetryBatch);

module.exports = router;
