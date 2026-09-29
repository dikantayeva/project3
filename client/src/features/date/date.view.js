import { qs } from '../../core/dom.js';

/** Блок "ВЫБЕРИТЕ ДАТУ СРЕЗА ДАННЫХ" с кнопкой "Ок" */
export function mountDateSelector(el, { store, dateActions }) {
    el.innerHTML = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label for="reading-date" class="block text-xs font-semibold text-gray-600 mb-1">ВЫБЕРИТЕ ДАТУ СРЕЗА ДАННЫХ:</label>
            <div class="flex gap-2">
                <input type="datetime-local" id="reading-date" class="w-full p-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button data-apply class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition">Ок</button>
            </div>
        </div>
    `;

    const input = qs(el, '#reading-date');
    input.value = store.getState().date.input;

    // Значение поля сразу попадает в состояние; данные перезапрашиваются только по кнопке "Ок"
    input.addEventListener('input', () => dateActions.setDateInput(input.value));
    qs(el, '[data-apply]').addEventListener('click', () => dateActions.applyDate());

    return () => {};
}
