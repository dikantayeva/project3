import { patchSlice } from '../../core/store.js';
import { TREND_LIMIT } from '../../core/config.js';
import { toApiDate } from '../date/dates.js';

/** Глубины датчиков, глубокие/меньшие значения depth_m — первыми (как в выпадающем списке) */
export function sortByDepthDesc(rows) {
    return rows.slice().sort((a, b) => b.depth_m - a.depth_m);
}

/** Пункты выпадающего списка "ГЛУБИНА ДАТЧИКА" */
export function getDepthOptions(profileRows) {
    return sortByDepthDesc(profileRows).map((row) => ({
        sensorId: row.sensor_id,
        label: `${row.depth_m} м (${row.sensor_id})`
    }));
}

/**
 * Загрузка и переключение графиков ("Профиль по глубине" / "Тренд по времени").
 * Зависимости передаются снаружи (api, notify) — экшены не знают ни про DOM, ни про Chart.js,
 * поэтому их можно тестировать в Node и целиком использовать из React-компонентов.
 */
export function createChartActions({ store, api, notify }) {
    // Защита от гонки запросов: каждый новый запрос получает следующий номер и применяется
    // только если он всё ещё самый последний — задержавшиеся в сети устаревшие ответы игнорируются.
    let profileSeq = 0;
    let trendSeq = 0;

    const setDisplay = (display) => patchSlice(store, 'chart', { display });

    async function loadProfile(objectId) {
        const requestId = ++profileSeq;

        // Сразу убираем старый график, чтобы он не "залипал", пока не пришёл ответ по новой дате
        patchSlice(store, 'chart', { selectedObjectId: objectId });
        setDisplay({ view: 'none', title: `Объект: ${objectId} — загрузка...`, rows: [], sensorId: null });

        const date = toApiDate(store.getState().date.input);

        try {
            const rows = await api.fetchObjectDetails(objectId, date);

            // Пока ответ летел, выбрали другой объект/дату — этот ответ устарел
            if (requestId !== profileSeq) return;

            if (!rows || rows.length === 0) {
                // Данных нет — очищаем и профиль (иначе в списке глубин висели бы датчики
                // прошлого объекта, и клик выглядел бы как "не сработал")
                patchSlice(store, 'chart', { profileRows: [] });
                setDisplay({
                    view: 'none',
                    title: `Объект: ${objectId} — нет данных за выбранную дату`,
                    rows: [],
                    sensorId: null
                });
                return;
            }

            const sorted = sortByDepthDesc(rows);
            patchSlice(store, 'chart', { profileRows: sorted });

            if (store.getState().chart.mode === 'trend') {
                // В режиме тренда список глубин пересобирается, выбирается первый датчик
                const first = getDepthOptions(sorted)[0];
                loadTrend(first ? first.sensorId : null);
            } else {
                setDisplay({ view: 'profile', title: `Объект: ${objectId}`, rows: sorted, sensorId: null });
            }
        } catch (err) {
            if (requestId !== profileSeq) return;
            console.error('Ошибка при загрузке данных:', err);
            setDisplay({ view: 'none', title: `Объект: ${objectId} — ошибка загрузки данных`, rows: [], sensorId: null });
        }
    }

    async function loadTrend(sensorId) {
        if (!sensorId) return;

        const requestId = ++trendSeq;

        patchSlice(store, 'chart', { selectedSensorId: sensorId });
        setDisplay({ view: 'none', title: `Датчик: ${sensorId} — загрузка тренда...`, rows: [], sensorId });

        try {
            const rows = await api.fetchSensorTrend(sensorId, TREND_LIMIT);

            // Пока ответ летел, выбрали другой датчик/объект/дату
            if (requestId !== trendSeq) return;

            if (!rows || rows.length === 0) {
                patchSlice(store, 'chart', { trend: { sensorId, rows: [] } });
                setDisplay({ view: 'none', title: `Датчик: ${sensorId} — нет данных`, rows: [], sensorId });
                return;
            }

            patchSlice(store, 'chart', { trend: { sensorId, rows } });
            setDisplay({ view: 'trend', title: `Датчик: ${sensorId} — тренд IL`, rows, sensorId });
        } catch (err) {
            if (requestId !== trendSeq) return;
            console.error('Ошибка при загрузке тренда:', err);
            setDisplay({ view: 'none', title: `Датчик: ${sensorId} — ошибка загрузки`, rows: [], sensorId });
        }
    }

    /** Переключение режима графика: 'profile' | 'trend' */
    function setMode(mode) {
        patchSlice(store, 'chart', { mode });
        const { chart } = store.getState();

        if (mode === 'profile') {
            if (chart.selectedObjectId) loadProfile(chart.selectedObjectId);
            return;
        }

        // mode === 'trend'
        if (chart.profileRows.length > 0) {
            const first = getDepthOptions(chart.profileRows)[0];
            loadTrend(first ? first.sensorId : null);
        } else if (chart.selectedObjectId) {
            notify('Сначала выберите объект и дату с доступными данными, чтобы получить список датчиков');
        }
    }

    /** Выбор датчика в выпадающем списке глубин */
    function selectSensor(sensorId) {
        loadTrend(sensorId);
    }

    return { loadProfile, loadTrend, setMode, selectSensor };
}
