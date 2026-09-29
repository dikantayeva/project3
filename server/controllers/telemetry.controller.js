const telemetryService = require('../services/telemetry.service');
const { hasRequiredFields, validateBatch } = telemetryService;

// POST /api/telemetry — одно показание за запрос
async function postTelemetry(req, res) {
    if (!hasRequiredFields(req.body)) {
        return res.status(400).json({
            success: false,
            message: 'Отсутствуют обязательные параметры (sensor_id, object_id или depth_m)'
        });
    }

    try {
        const reading = await telemetryService.saveReading(req.body);

        res.json({
            success: true,
            message: 'Данные телеметрии успешно сохранены',
            reading
        });
    } catch (err) {
        console.error('Ошибка при сохранении телеметрии:', err);
        res.status(500).json({ success: false, message: 'Ошибка сервера при записи данных' });
    }
}

/**
 * POST /api/telemetry/batch — пакетная отправка телеметрии одним запросом.
 *
 * Тело запроса — один из двух вариантов:
 *   [ {...}, {...}, ... ]
 *   { "readings": [ {...}, {...} ] }
 *
 * Каждый элемент: { sensor_id, object_id, depth_m, w_percent, wl_value, wp_value, il_value, timestamp }
 * (timestamp необязателен — если не передан, подставляется текущее время)
 *
 * Одна повреждённая запись НЕ отменяет весь пакет — она попадает в "errors",
 * а остальные сохраняются.
 */
async function postTelemetryBatch(req, res) {
    const readings = Array.isArray(req.body) ? req.body : req.body?.readings;

    if (!Array.isArray(readings) || readings.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Ожидается массив показаний: [ {...}, {...} ] или { "readings": [ {...}, {...} ] }'
        });
    }

    const { valid, errors } = validateBatch(readings);

    if (valid.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Ни одна запись в пакете не прошла проверку',
            saved_count: 0,
            error_count: errors.length,
            errors
        });
    }

    try {
        const saved = await telemetryService.saveReadingsBatch(valid);

        res.json({
            success: true,
            message: `Сохранено ${saved.length} из ${readings.length} показаний`,
            saved_count: saved.length,
            error_count: errors.length,
            readings: saved,
            errors
        });
    } catch (err) {
        console.error('Ошибка при пакетном сохранении телеметрии:', err);
        res.status(500).json({ success: false, message: 'Ошибка сервера при пакетной записи данных' });
    }
}

module.exports = { postTelemetry, postTelemetryBatch };
