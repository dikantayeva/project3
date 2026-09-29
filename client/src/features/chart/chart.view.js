import Chart from 'chart.js/auto';
import { watch } from '../../core/store.js';
import { qs } from '../../core/dom.js';
import { getDepthOptions } from './chart.actions.js';
import { buildChartConfig } from './chart.configs.js';

const ACTIVE = ['bg-blue-600', 'text-white'];
const INACTIVE = ['bg-gray-200', 'text-gray-700'];

/**
 * Кнопки режима ("Профиль" / "Тренд"), "Экспорт CSV" и выпадающий список глубин.
 * Всё, что видно на экране, вычисляется из состояния (chart.mode, profileRows, selectedSensorId).
 * (В React: <ChartControls />.)
 */
export function mountChartControls(el, { store, chartActions, exportActions }) {
    el.innerHTML = `
        <div class="flex gap-2 mb-3 items-center">
            <button data-mode="profile" class="px-3 py-1.5 text-xs font-semibold rounded">
                Профиль по глубине
            </button>
            <button data-mode="trend" class="px-3 py-1.5 text-xs font-semibold rounded">
                Тренд по времени
            </button>
            <button data-export class="ml-auto px-3 py-1.5 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700">
                Экспорт CSV
            </button>
        </div>

        <div data-depth-wrapper class="mb-3" style="display: none;">
            <label for="depth-select" class="block text-xs font-semibold text-gray-600 mb-1">ГЛУБИНА ДАТЧИКА:</label>
            <select id="depth-select" data-depth-select class="w-full p-2 border border-gray-300 rounded text-sm bg-white"></select>
        </div>
    `;

    const profileBtn = qs(el, '[data-mode="profile"]');
    const trendBtn = qs(el, '[data-mode="trend"]');
    const depthWrapper = qs(el, '[data-depth-wrapper]');
    const depthSelect = qs(el, '[data-depth-select]');

    profileBtn.addEventListener('click', () => chartActions.setMode('profile'));
    trendBtn.addEventListener('click', () => chartActions.setMode('trend'));
    qs(el, '[data-export]').addEventListener('click', () => exportActions.exportCurrentChart());
    depthSelect.addEventListener('change', () => chartActions.selectSensor(depthSelect.value));

    const setActive = (btn, active) => {
        btn.classList.remove(...(active ? INACTIVE : ACTIVE));
        btn.classList.add(...(active ? ACTIVE : INACTIVE));
    };

    const stops = [
        // Подсветка активного режима и показ списка глубин только в режиме тренда
        watch(store, [(s) => s.chart.mode], (mode) => {
            setActive(profileBtn, mode === 'profile');
            setActive(trendBtn, mode === 'trend');
            depthWrapper.style.display = mode === 'trend' ? 'block' : 'none';
        }),

        // Пункты списка глубин строятся из последнего загруженного профиля
        watch(store, [(s) => s.chart.profileRows, (s) => s.chart.selectedSensorId], (rows, selectedId) => {
            depthSelect.innerHTML = '';
            getDepthOptions(rows).forEach(({ sensorId, label }) => {
                const option = document.createElement('option');
                option.value = sensorId;
                option.textContent = label;
                depthSelect.appendChild(option);
            });
            if (selectedId) depthSelect.value = selectedId;
        })
    ];

    return () => stops.forEach((off) => off());
}

/**
 * Заголовок + холст графика. Сам решает, что рисовать, по store.chart.display.
 * (В React: <ChartPanel display={...} /> с useEffect, создающим и уничтожающим Chart.)
 */
export function mountChartPanel(el, { store }) {
    el.innerHTML = `
        <h2 data-title class="text-xl font-semibold mb-4 text-blue-600"></h2>
        <div class="relative">
            <canvas data-canvas class="chart-canvas"></canvas>
        </div>
        <div class="mt-4 text-sm text-gray-500">
            Нажмите на маркер на карте, чтобы загрузить данные из БД.
        </div>
    `;

    const titleEl = qs(el, '[data-title]');
    const canvas = qs(el, '[data-canvas]');
    let chart = null;

    const stop = watch(store, [(s) => s.chart.display], (display) => {
        titleEl.textContent = display.title;

        // Удаляем старый график перед созданием нового
        if (chart) {
            chart.destroy();
            chart = null;
        }

        const config = buildChartConfig(display);
        if (config) chart = new Chart(canvas.getContext('2d'), config);
    });

    return () => {
        stop();
        if (chart) chart.destroy();
    };
}
