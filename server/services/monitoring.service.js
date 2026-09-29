const { pool } = require('../db/pool');

// Данные для дашборда: объекты на карте, профиль по глубине, тренд датчика.

/**
 * Объекты для КАРТЫ со средними IL / W.
 *
 * Если передана дата среза — считаем среднее только по показаниям КОНКРЕТНОЙ МИНУТЫ
 * (секунды игнорируем — телеметрия может приходить с небольшим смещением в секундах).
 * Раньше тут было DATE(sr.timestamp) = $1, из-за чего в среднее попадали ВСЕ показания
 * за сутки, а не только за выбранное время — точки на карте не различали 9:55 и 10:10.
 *
 * Без даты avg_il / avg_w считаются по ВСЕЙ истории показаний.
 */
async function getObjectsWithAverages(selectedDate) {
    if (selectedDate) {
        const query = `
            SELECT
                o.object_id, o.lat, o.lng, o.n_levels,
                (SELECT AVG(il_value) FROM sensor_readings sr JOIN sensors s ON sr.sensor_id = s.sensor_id WHERE s.object_id = o.object_id AND date_trunc('minute', sr.timestamp) = date_trunc('minute', $1::timestamptz)) as avg_il,
                (SELECT AVG(w_percent) FROM sensor_readings sr JOIN sensors s ON sr.sensor_id = s.sensor_id WHERE s.object_id = o.object_id AND date_trunc('minute', sr.timestamp) = date_trunc('minute', $1::timestamptz)) as avg_w
            FROM objects o;
        `;
        const { rows } = await pool.query(query, [selectedDate]);
        return rows;
    }

    const query = `
        SELECT
            o.object_id, o.lat, o.lng, o.n_levels,
            (SELECT AVG(il_value) FROM sensor_readings sr JOIN sensors s ON sr.sensor_id = s.sensor_id WHERE s.object_id = o.object_id) as avg_il,
            (SELECT AVG(w_percent) FROM sensor_readings sr JOIN sensors s ON sr.sensor_id = s.sensor_id WHERE s.object_id = o.object_id) as avg_w
        FROM objects o;
    `;
    const { rows } = await pool.query(query);
    return rows;
}

/**
 * Все показания датчиков объекта (для графика "Профиль по глубине").
 *
 * Если передана дата — сравниваем конкретную минуту, а не весь день
 * (раньше DATE(SR.timestamp) = $2 подтягивал ВСЕ показания за сутки — отсюда по 2-3 точки
 * на один и тот же уровень глубины и задвоенные строки в дропдауне "Тренд по времени").
 */
async function getObjectReadings(objectId, selectedDate) {
    if (selectedDate) {
        const query = `
            SELECT SR.*, S.depth_m
            FROM sensors S
            JOIN sensor_readings SR ON S.sensor_id = SR.sensor_id
            WHERE S.object_id = $1 AND date_trunc('minute', SR.timestamp) = date_trunc('minute', $2::timestamptz)
            ORDER BY S.depth_m ASC;
        `;
        const result = await pool.query(query, [objectId, selectedDate]);
        return result.rows;
    }

    const query = `
        SELECT SR.*, S.depth_m
        FROM sensors S
        JOIN sensor_readings SR ON S.sensor_id = SR.sensor_id
        WHERE S.object_id = $1
        ORDER BY S.depth_m ASC;
    `;
    const result = await pool.query(query, [objectId]);
    return result.rows;
}

/**
 * Последние N показаний ОДНОГО датчика в хронологическом порядке
 * (для графика "Тренд по времени").
 */
async function getSensorTrend(sensorId, limit) {
    const query = `
        SELECT * FROM (
            SELECT sensor_id, timestamp, w_percent, wl_value, wp_value, il_value
            FROM sensor_readings
            WHERE sensor_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
        ) last_readings
        ORDER BY timestamp ASC;
    `;
    const result = await pool.query(query, [sensorId, limit]);
    return result.rows;
}

module.exports = { getObjectsWithAverages, getObjectReadings, getSensorTrend };
