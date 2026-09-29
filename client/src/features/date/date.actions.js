import { patchSlice } from '../../core/store.js';

export function createDateActions({ store, chartActions, objectsActions, mapActions }) {
    /** Пользователь меняет значение в поле (пока без применения — как и раньше, до кнопки "Ок") */
    function setDateInput(value) {
        patchSlice(store, 'date', { input: value });
    }

    /**
     * Кнопка "Ок": обновляем график выбранного объекта, перекрашиваем маркеры
     * и пересчитываем активные слои интерполяции под новую дату.
     */
    async function applyDate() {
        const { selectedObjectId } = store.getState().chart;
        if (selectedObjectId) chartActions.loadProfile(selectedObjectId);

        // Один запрос объектов обслуживает и маркеры, и слои интерполяции
        const objects = await objectsActions.loadObjects();
        if (objects) await mapActions.refresh(objects);
    }

    return { setDateInput, applyDate };
}
