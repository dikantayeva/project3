import { watch } from '../../core/store.js';
import { qs } from '../../core/dom.js';

const W_BTN_OFF = ['bg-teal-500', 'hover:bg-teal-600'];
const W_BTN_ON = ['bg-red-600', 'hover:bg-red-700'];

/**
 * Панель над картой: кнопки слоёв "Average IL" / "Average W" и поиск объекта по ID.
 * Подписи и цвета кнопок вычисляются из state.layers, список автодополнения — из state.objects.
 */
export function mountMapToolbar(el, { store, mapActions }) {
    el.innerHTML = `
        <div class="mb-4 flex gap-2 items-center flex-wrap">
            <button data-il class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow">Average IL</button>
            <button data-w class="text-white px-4 py-2 rounded shadow">Average W</button>

            <div class="flex gap-2 ml-auto">
                <input type="text" data-search list="objectSearchList"
                       placeholder="Поиск объекта (ID)..."
                       class="px-3 py-2 border border-gray-300 rounded text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <datalist id="objectSearchList"></datalist>
                <button data-search-btn class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded shadow text-sm">Найти</button>
            </div>
        </div>
    `;

    const ilBtn = qs(el, '[data-il]');
    const wBtn = qs(el, '[data-w]');
    const searchInput = qs(el, '[data-search]');
    const datalist = qs(el, '#objectSearchList');

    ilBtn.addEventListener('click', () => mapActions.toggleIl());
    wBtn.addEventListener('click', () => mapActions.toggleW());

    const search = () => mapActions.goToObject(searchInput.value);
    qs(el, '[data-search-btn]').addEventListener('click', search);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') search();
    });

    const stops = [
        watch(store, [(s) => s.layers.il], (il) => {
            ilBtn.innerText = il ? 'Hide IL Map' : 'Average IL';
        }),

        watch(store, [(s) => s.layers.w], (w) => {
            wBtn.innerText = w ? 'Hide W Map' : 'Average W';
            wBtn.classList.remove(...(w ? W_BTN_OFF : W_BTN_ON));
            wBtn.classList.add(...(w ? W_BTN_ON : W_BTN_OFF));
        }),

        // Заполняем список автодополнения ID-шниками объектов
        watch(store, [(s) => s.objects.list], (list) => {
            datalist.innerHTML = '';
            list.forEach((obj) => {
                const option = document.createElement('option');
                option.value = obj.object_id;
                datalist.appendChild(option);
            });
        })
    ];

    return () => stops.forEach((off) => off());
}
