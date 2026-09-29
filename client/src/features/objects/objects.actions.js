import { patchSlice } from '../../core/store.js';
import { toApiDate } from '../date/dates.js';

/**
 * Ответ /api/objects -> массив точек [lat, lng, value] для интерполяции.
 * Объекты без значения (null) отбрасываются.
 *
 * @param {object[]} objects
 * @param {'avg_il'|'avg_w'} field
 * @returns {Array<[number, number, number]>}
 */
export function objectsToPoints(objects, field) {
    return objects
        .filter((o) => o[field] !== null && o[field] !== undefined)
        .map((o) => [parseFloat(o.lat), parseFloat(o.lng), parseFloat(o[field])]);
}

export function createObjectsActions({ store, api }) {
    /**
     * Загружает объекты на выбранный момент времени и кладёт в состояние
     * (маркеры на карте и список поиска перерисуются сами — см. MapController.bindToStore).
     * @returns {Promise<object[]|null>} список объектов или null при ошибке
     */
    async function loadObjects() {
        try {
            const objects = await api.fetchObjects(toApiDate(store.getState().date.input));
            patchSlice(store, 'objects', { list: objects });
            return objects;
        } catch (err) {
            console.error('Ошибка загрузки объектов:', err);
            return null;
        }
    }

    return { loadObjects };
}
