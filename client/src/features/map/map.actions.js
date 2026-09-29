import { patchSlice } from '../../core/store.js';
import { toApiDate } from '../date/dates.js';
import { objectsToPoints } from '../objects/objects.actions.js';

/**
 * Действия над картой: слои "Average IL" (кригинг) и "Average W" (ореолы), поиск объекта.
 *
 * mapPort — узкий интерфейс к карте (его реализует MapController):
 *   mapPort.il.enable(points) / .disable()    — слой IL; enable повторно = пересчитать
 *   mapPort.w.enable(points)  / .disable()    — слой W;  enable повторно = перерисовать
 *   mapPort.focusObject(objectId) -> boolean  — приблизить карту к объекту
 * Экшен не знает про Leaflet — только про этот интерфейс и состояние.
 */
export function createMapActions({ store, api, notify, mapPort }) {
    const setLayer = (name, on) => patchSlice(store, 'layers', { [name]: on });

    const fetchCurrentObjects = () => api.fetchObjects(toApiDate(store.getState().date.input));

    function disableIl() {
        mapPort.il.disable();
        setLayer('il', false);
    }

    async function toggleIl() {
        if (store.getState().layers.il) {
            disableIl();
            return;
        }

        try {
            const points = objectsToPoints(await fetchCurrentObjects(), 'avg_il');
            if (points.length === 0) return notify('Нет данных');

            mapPort.il.enable(points);
            setLayer('il', true);
        } catch (err) {
            console.error(err);
        }
    }

    async function toggleW() {
        if (store.getState().layers.w) {
            mapPort.w.disable();
            setLayer('w', false);
            return;
        }

        // Как и раньше: при включении W слой IL выключается, чтобы они не накладывались
        if (store.getState().layers.il) disableIl();

        try {
            const points = objectsToPoints(await fetchCurrentObjects(), 'avg_w');
            if (points.length === 0) return notify('Нет данных по влажности');

            mapPort.w.enable(points);
            setLayer('w', true);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Пересчитывает включённые слои под новые данные (после смены даты).
     * @param {object[]} objects  свежий ответ /api/objects
     */
    async function refresh(objects) {
        const { layers } = store.getState();

        if (layers.il) {
            const points = objectsToPoints(objects, 'avg_il');
            if (points.length > 0) {
                mapPort.il.enable(points); // переобучает модель на новых данных
            } else {
                disableIl();
            }
        }

        if (layers.w) {
            const points = objectsToPoints(objects, 'avg_w');
            if (points.length > 0) {
                mapPort.w.enable(points);
            } else {
                mapPort.w.disable();
                setLayer('w', false);
            }
        }
    }

    /** Поиск объекта по ID: карта приближается к нему, открывается подсказка, грузится график */
    function goToObject(rawId) {
        const objectId = (rawId || '').trim();
        if (!objectId) return;

        if (!mapPort.focusObject(objectId)) notify(`Объект с ID "${objectId}" не найден`);
    }

    return { toggleIl, toggleW, refresh, goToObject };
}
