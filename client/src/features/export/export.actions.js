// Преобразует массив объектов в CSV-строку (разделитель ';' — так открывается в русском Excel)
export function arrayToCSV(rows, columns) {
    const header = columns.map((c) => c.label).join(';');
    const lines = rows.map((row) =>
        columns
            .map((c) => {
                const val = row[c.key];
                return val === null || val === undefined ? '' : String(val).replace(/;/g, ',');
            })
            .join(';')
    );
    return [header, ...lines].join('\n');
}

const col = (key) => ({ key, label: key });

export const PROFILE_COLUMNS = [
    'sensor_id',
    'depth_m',
    'timestamp',
    'w_percent',
    'wl_value',
    'wp_value',
    'il_value'
].map(col);

export const TREND_COLUMNS = ['timestamp', 'w_percent', 'wl_value', 'wp_value', 'il_value'].map(col);

/**
 * Экспорт данных ТЕКУЩЕГО графика (профиль по объекту или тренд по датчику) в CSV.
 * download и notify передаются снаружи — так экшен не зависит от браузера и легко тестируется.
 */
export function createExportActions({ store, download, notify }) {
    function exportCurrentChart() {
        const { chart } = store.getState();

        if (chart.mode === 'profile') {
            if (chart.profileRows.length === 0) {
                notify('Нет данных для экспорта. Сначала выберите объект.');
                return;
            }
            const csv = arrayToCSV(chart.profileRows, PROFILE_COLUMNS);
            download(csv, `profile_object_${chart.selectedObjectId || 'object'}.csv`);
            return;
        }

        if (chart.trend.rows.length === 0) {
            notify('Нет данных для экспорта. Сначала выберите глубину датчика в режиме "Тренд".');
            return;
        }
        const csv = arrayToCSV(chart.trend.rows, TREND_COLUMNS);
        download(csv, `trend_sensor_${chart.trend.sensorId || 'sensor'}.csv`);
    }

    return { exportCurrentChart };
}
