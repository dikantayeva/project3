import { createStore, watch } from '../core/store.js';
import { createInitialState } from '../core/initialState.js';
import { downloadCsv } from '../core/dom.js';
import { loadSession, saveSession, clearSession } from '../core/session.js';
import * as api from '../core/api.js';

import { createAuthActions } from '../features/auth/auth.actions.js';
import { createObjectsActions } from '../features/objects/objects.actions.js';
import { createChartActions } from '../features/chart/chart.actions.js';
import { createMapActions } from '../features/map/map.actions.js';
import { createDateActions } from '../features/date/date.actions.js';
import { createExportActions } from '../features/export/export.actions.js';

import { MapController } from '../features/map/MapController.js';

import { mountLayout } from './layout.js';
import { mountAuthBar } from '../features/auth/auth.view.js';
import { mountDateSelector } from '../features/date/date.view.js';
import { mountChartControls, mountChartPanel } from '../features/chart/chart.view.js';
import { mountMapToolbar } from '../features/map/map-toolbar.view.js';

/**
 * Composition root — единственное место, где всё собирается вместе:
 * состояние, API, экшены, карта и view. Здесь же видно, кто от кого зависит.
 *
 * Порядок зависимостей (стрелка = "использует"):
 *   view  →  actions  →  api / store          (view читает store и вызывает actions)
 *   MapController  ←  actions (через узкий mapPort)
 * При переходе на React этот файл превращается в <App> + провайдеры (store, actions, map).
 */
export function bootstrap(root) {
    const store = createStore(createInitialState());

    // Всё, что "выходит наружу" из логики (алерты, скачивание, перезагрузка), — через зависимости.
    // В React notify станет тостом, reload — сбросом состояния.
    const notify = (message) => window.alert(message);
    const session = { load: loadSession, save: saveSession, clear: clearSession };

    // --- Каркас страницы и карта ---
    const layout = mountLayout(root, { store });
    const { slots } = layout;

    // Клик по маркеру подгружает график. actions создаются ниже, но к моменту клика уже готовы.
    const actions = {};
    const mapController = new MapController(slots.map, {
        onObjectSelect: (objectId) => actions.chart.loadProfile(objectId)
    });

    // --- Экшены (бизнес-логика без DOM) ---
    actions.auth = createAuthActions({ store, api, session, reload: () => window.location.reload() });
    actions.objects = createObjectsActions({ store, api });
    actions.chart = createChartActions({ store, api, notify });
    // mapPort = MapController: экшены видят только .il, .w и .focusObject()
    actions.map = createMapActions({ store, api, notify, mapPort: mapController });
    actions.date = createDateActions({
        store,
        chartActions: actions.chart,
        objectsActions: actions.objects,
        mapActions: actions.map
    });
    actions.export = createExportActions({ store, download: downloadCsv, notify });

    // --- Связка состояния с картой и view ---
    mapController.bindToStore(store);

    mountAuthBar(slots.auth, { store, authActions: actions.auth });
    mountDateSelector(slots.date, { store, dateActions: actions.date });
    mountChartControls(slots['chart-controls'], {
        store,
        chartActions: actions.chart,
        exportActions: actions.export
    });
    mountChartPanel(slots['chart-panel'], { store });
    mountMapToolbar(slots['map-toolbar'], { store, mapActions: actions.map });

    // Карта создаётся, пока дашборд скрыт (у неё нулевой размер), — после входа
    // Leaflet нужно сообщить о новых размерах контейнера
    watch(
        store,
        [(s) => s.auth.user],
        (user) => {
            if (user) setTimeout(() => mapController.invalidateSize(), 200);
        },
        { immediate: false }
    );

    // --- Запуск ---
    actions.auth.restoreSession(); // если пользователь уже входил — сразу показываем дашборд
    actions.objects.loadObjects(); // маркеры на карте на дату по умолчанию

    return { store, actions, mapController };
}
