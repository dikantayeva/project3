const { pool } = require('../db/pool');

// ---------- Валидация входящих показаний ----------

/** Обязательные поля показания: sensor_id, object_id, depth_m. */
function hasRequiredFields({ sensor_id, object_id, depth_m } = {}) {
    return Boolean(sensor_id) && Boolean(object_id) && depth_m !== undefined;
}

/**
 * Разбирает массив показаний из пакета и валидирует каждую запись отдельно,
 * чтобы одна плохая запись не роняла весь пакет.
 *
 * @returns {{ valid: object[], errors: object[] }}
 */
function validateBatch(readings) {
    const valid = [];
    const errors = [];

    readings.forEach((item, index) => {
        const { sensor_id, object_id, depth_m, w_percent, wl_value, wp_value, il_value, timestamp } = item || {};

        if (!hasRequiredFields({ sensor_id, object_id, depth_m })) {
            errors.push({
                index,
                sensor_id: sensor_id ?? null,
                message: 'Отсутствуют обязательные параметры (sensor_id, object_id или depth_m)'
            });
            return;
        }

        valid.push({
            sensor_id,
            object_id,
            depth_m,
            w_percent: w_percent ?? null,
            wl_value: wl_value ?? null,
            wp_value: wp_value ?? null,
            il_value: il_value ?? null,
            timestamp: timestamp || new Date().toISOString()
        });
    });

    return { valid, errors };
}

// ---------- Сохранение в БД ----------

/**
 * Сохранение ОДНОГО показания.
 * Шаг 1: убеждаемся, что датчик зарегистрирован в таблице sensors
 *        (если его нет — добавляем, чтобы не сработал Foreign Key).
 * Шаг 2: записываем само измерение в sensor_readings.
 */
async function saveReading({ sensor_id, object_id, depth_m, w_percent, wl_value, wp_value, il_value, timestamp }) {
    await pool.query(`
        INSERT INTO sensors (sensor_id, object_id, depth_m)
        VALUES ($1, $2, $3)
        ON CONFLICT (sensor_id) DO NOTHING;
    `, [sensor_id, object_id, depth_m]);

    const readingQuery = `
        INSERT INTO sensor_readings (sensor_id, timestamp, w_percent, wl_value, wp_value, il_value)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

    // Если timestamp не передан извне — подставляем текущее время
    const eventTime = timestamp || new Date();

    const values = [
        sensor_id,
        eventTime,
        w_percent || null,
        wl_value || null,
        wp_value || null,
        il_value || null
    ];

    const result = await pool.query(readingQuery, values);
    return result.rows[0];
}

/**
 * Пакетное сохранение: все новые датчики регистрируются одним запросом,
 * все показания вставляются одним запросом (а не по одному).
 * На вход — уже провалидированные записи (см. validateBatch).
 */
async function saveReadingsBatch(valid) {
    // Шаг 1. Регистрируем все новые датчики (уже существующие пропускаются)
    await pool.query(`
        INSERT INTO sensors (sensor_id, object_id, depth_m)
        SELECT * FROM UNNEST($1::text[], $2::text[], $3::numeric[])
        ON CONFLICT (sensor_id) DO NOTHING;
    `, [
        valid.map(v => v.sensor_id),
        valid.map(v => v.object_id),
        valid.map(v => v.depth_m)
    ]);

    // Шаг 2. Вставляем ВСЕ показания
    const result = await pool.query(`
        INSERT INTO sensor_readings (sensor_id, timestamp, w_percent, wl_value, wp_value, il_value)
        SELECT * FROM UNNEST($1::text[], $2::timestamptz[], $3::numeric[], $4::numeric[], $5::numeric[], $6::numeric[])
        RETURNING *;
    `, [
        valid.map(v => v.sensor_id),
        valid.map(v => v.timestamp),
        valid.map(v => v.w_percent),
        valid.map(v => v.wl_value),
        valid.map(v => v.wp_value),
        valid.map(v => v.il_value)
    ]);

    return result.rows;
}

module.exports = { hasRequiredFields, validateBatch, saveReading, saveReadingsBatch };
