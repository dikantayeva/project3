import { watch } from '../core/store.js';
import { qs } from '../core/dom.js';

/**
 * Каркас страницы: только разметка и "слоты", куда потом монтируются feature-view.
 * Показывает/прячет дашборд в зависимости от того, вошёл ли пользователь.
 * (В React это компонент <AppLayout> с {children}/слотами.)
 *
 * @returns {{ slots: Record<string, HTMLElement>, unmount: () => void }}
 */
export function mountLayout(root, { store }) {
    root.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div data-slot="auth"></div>

            <header class="mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Мониторинг влажности почвы</h1>
            </header>

            <div data-dashboard style="display: none;">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-4 rounded-xl shadow-lg">

                    <!-- Левая панель: дата и график -->
                    <div class="sidebar p-4 rounded-lg">
                        <div data-slot="date"></div>
                        <div data-slot="chart-controls"></div>
                        <div data-slot="chart-panel"></div>
                    </div>

                    <!-- Правая панель: карта -->
                    <div class="lg:col-span-2">
                        <div data-slot="map-toolbar"></div>
                        <div data-slot="map" id="map"></div>
                    </div>

                </div>
            </div>
        </div>
    `;

    const slots = {};
    root.querySelectorAll('[data-slot]').forEach((el) => {
        slots[el.dataset.slot] = el;
    });

    const dashboard = qs(root, '[data-dashboard]');

    // Дашборд виден только после входа
    const stop = watch(store, [(s) => s.auth.user], (user) => {
        dashboard.style.display = user ? 'block' : 'none';
    });

    return { slots, unmount: stop };
}
