import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore, patchSlice, watch } from '../src/core/store.js';
import { createInitialState } from '../src/core/initialState.js';
import { createChartActions, getDepthOptions } from '../src/features/chart/chart.actions.js';
import { createMapActions } from '../src/features/map/map.actions.js';
import { createExportActions } from '../src/features/export/export.actions.js';
import { createDateActions } from '../src/features/date/date.actions.js';
import { createAuthActions } from '../src/features/auth/auth.actions.js';

// Промис, который можно завершить снаружи — для имитации "медленного" сервера
function deferred() {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const ROWS = [
    { sensor_id: 'S1', depth_m: -1, il_value: 0.1 },
    { sensor_id: 'S3', depth_m: -3, il_value: 0.9 },
    { sensor_id: 'S2', depth_m: -2, il_value: -0.4 }
];

// ---------- store ----------

test('store: watch срабатывает только при изменении выбранного куска', () => {
    const store = createStore(createInitialState());
    const seen = [];
    watch(store, [(s) => s.layers.il], (il) => seen.push(il));
    patchSlice(store, 'layers', { w: true }); // il не менялся
    patchSlice(store, 'layers', { il: true });
    assert.deepEqual(seen, [false, true]);
});

// ---------- chart.actions ----------

test('loadProfile: сортирует по глубине, рисует профиль, заголовок объекта', async () => {
    const store = createStore(createInitialState());
    const api = { fetchObjectDetails: async () => ROWS };
    const chart = createChartActions({ store, api, notify: () => {} });

    await chart.loadProfile('OBJ1');

    const { display, profileRows, selectedObjectId } = store.getState().chart;
    assert.equal(selectedObjectId, 'OBJ1');
    assert.equal(display.view, 'profile');
    assert.equal(display.title, 'Объект: OBJ1');
    assert.deepEqual(profileRows.map((r) => r.sensor_id), ['S1', 'S2', 'S3']);
    assert.deepEqual(getDepthOptions(ROWS).map((o) => o.label), ['-1 м (S1)', '-2 м (S2)', '-3 м (S3)']);
});

test('loadProfile: дата из состояния уходит в API в формате Алматы', async () => {
    const store = createStore(createInitialState());
    let usedDate;
    const api = { fetchObjectDetails: async (id, date) => ((usedDate = date), ROWS) };
    await createChartActions({ store, api, notify: () => {} }).loadProfile('X');
    assert.equal(usedDate, '2026-05-05T12:00:00+05:00');
});

test('loadProfile: пустой ответ очищает профиль и пишет "нет данных"', async () => {
    const store = createStore(createInitialState());
    const chart = createChartActions({ store, api: { fetchObjectDetails: async () => [] }, notify: () => {} });
    patchSlice(store, 'chart', { profileRows: ROWS });

    await chart.loadProfile('OBJ1');

    assert.deepEqual(store.getState().chart.profileRows, []);
    assert.equal(store.getState().chart.display.title, 'Объект: OBJ1 — нет данных за выбранную дату');
    assert.equal(store.getState().chart.display.view, 'none');
});

test('loadProfile: ошибка сети -> "ошибка загрузки данных"', async () => {
    const store = createStore(createInitialState());
    const api = { fetchObjectDetails: async () => { throw new Error('boom'); } };
    const orig = console.error;
    console.error = () => {};
    await createChartActions({ store, api, notify: () => {} }).loadProfile('OBJ1');
    console.error = orig;
    assert.equal(store.getState().chart.display.title, 'Объект: OBJ1 — ошибка загрузки данных');
});

test('защита от гонки: устаревший ответ не перезаписывает свежий', async () => {
    const store = createStore(createInitialState());
    const slow = deferred();
    const fast = deferred();
    const api = {
        fetchObjectDetails: (id) => (id === 'OLD' ? slow.promise : fast.promise)
    };
    const chart = createChartActions({ store, api, notify: () => {} });

    const p1 = chart.loadProfile('OLD');
    const p2 = chart.loadProfile('NEW');

    fast.resolve([{ sensor_id: 'N1', depth_m: -1, il_value: 0 }]);
    await p2;
    slow.resolve([{ sensor_id: 'O1', depth_m: -1, il_value: 5 }]); // приходит позже
    await p1;

    const { display, profileRows } = store.getState().chart;
    assert.equal(display.title, 'Объект: NEW');
    assert.equal(profileRows[0].sensor_id, 'N1');
});

test('setMode("trend"): грузит тренд первого датчика; в режиме тренда профиль тянет тренд', async () => {
    const store = createStore(createInitialState());
    const calls = [];
    const api = {
        fetchObjectDetails: async () => ROWS,
        fetchSensorTrend: async (id, limit) => (calls.push([id, limit]), [{ timestamp: '2026-05-05T07:00:00Z', il_value: 0.3 }])
    };
    const chart = createChartActions({ store, api, notify: () => {} });

    await chart.loadProfile('OBJ1');
    chart.setMode('trend');
    await flush();

    assert.deepEqual(calls[0], ['S1', 50]);
    assert.equal(store.getState().chart.display.view, 'trend');
    assert.equal(store.getState().chart.display.title, 'Датчик: S1 — тренд IL');
    assert.equal(store.getState().chart.selectedSensorId, 'S1');

    // повторная загрузка профиля в режиме тренда сразу переходит к тренду первого датчика
    await chart.loadProfile('OBJ1');
    await flush();
    assert.equal(calls.length, 2);
    assert.equal(store.getState().chart.display.view, 'trend');
});

test('setMode("trend") без данных профиля: предупреждение, если объект выбран', () => {
    const store = createStore(createInitialState());
    const messages = [];
    const chart = createChartActions({ store, api: {}, notify: (m) => messages.push(m) });

    chart.setMode('trend'); // объект не выбран — тишина
    assert.equal(messages.length, 0);

    patchSlice(store, 'chart', { selectedObjectId: 'OBJ1', mode: 'profile' });
    chart.setMode('trend');
    assert.equal(messages.length, 1);
});

test('setMode("profile"): перезагружает выбранный объект', async () => {
    const store = createStore(createInitialState());
    let loads = 0;
    const api = { fetchObjectDetails: async () => (loads++, ROWS) };
    const chart = createChartActions({ store, api, notify: () => {} });
    patchSlice(store, 'chart', { selectedObjectId: 'OBJ1', mode: 'trend' });

    chart.setMode('profile');
    await flush();

    assert.equal(loads, 1);
    assert.equal(store.getState().chart.display.view, 'profile');
});

// ---------- export.actions ----------

test('exportCurrentChart: профиль / тренд / пустые данные', async () => {
    const store = createStore(createInitialState());
    const downloads = [];
    const messages = [];
    const exp = createExportActions({
        store,
        download: (csv, name) => downloads.push([csv, name]),
        notify: (m) => messages.push(m)
    });

    exp.exportCurrentChart();
    assert.match(messages[0], /Сначала выберите объект/);

    patchSlice(store, 'chart', { selectedObjectId: 'OBJ1', profileRows: ROWS });
    exp.exportCurrentChart();
    assert.equal(downloads[0][1], 'profile_object_OBJ1.csv');

    patchSlice(store, 'chart', { mode: 'trend' });
    exp.exportCurrentChart();
    assert.match(messages[1], /глубину датчика/);

    patchSlice(store, 'chart', { trend: { sensorId: 'S1', rows: [{ timestamp: 't', il_value: 1 }] } });
    exp.exportCurrentChart();
    assert.equal(downloads[1][1], 'trend_sensor_S1.csv');
    assert.ok(downloads[1][0].startsWith('timestamp;w_percent;wl_value;wp_value;il_value'));
});

// ---------- map.actions ----------

function makeLayers(objects) {
    const store = createStore(createInitialState());
    const log = [];
    const messages = [];
    const mapPort = {
        il: { enable: (p) => log.push(['il.enable', p.length]), disable: () => log.push(['il.disable']) },
        w: { enable: (p) => log.push(['w.enable', p.length]), disable: () => log.push(['w.disable']) },
        focusObject: (id) => (log.push(['focus', id]), id === 'A')
    };
    const layers = createMapActions({
        store,
        api: { fetchObjects: async () => objects },
        notify: (m) => messages.push(m),
        mapPort
    });
    return { store, layers, log, messages };
}

const OBJECTS = [
    { object_id: 'A', lat: '51.1', lng: '71.4', avg_il: '0.2', avg_w: '25' },
    { object_id: 'B', lat: '51.2', lng: '71.5', avg_il: null, avg_w: null }
];

test('toggleIl: включает, повторный вызов выключает', async () => {
    const { store, layers, log } = makeLayers(OBJECTS);
    await layers.toggleIl();
    assert.equal(store.getState().layers.il, true);
    await layers.toggleIl();
    assert.equal(store.getState().layers.il, false);
    assert.deepEqual(log, [['il.enable', 1], ['il.disable']]);
});

test('toggleIl: нет данных -> предупреждение и слой не включается', async () => {
    const { store, layers, messages } = makeLayers([{ ...OBJECTS[1] }]);
    await layers.toggleIl();
    assert.deepEqual(messages, ['Нет данных']);
    assert.equal(store.getState().layers.il, false);
});

test('toggleW: выключает IL, затем включает W; нет данных -> своё сообщение', async () => {
    const { store, layers, log } = makeLayers(OBJECTS);
    await layers.toggleIl();
    await layers.toggleW();
    assert.equal(store.getState().layers.il, false);
    assert.equal(store.getState().layers.w, true);
    assert.deepEqual(log, [['il.enable', 1], ['il.disable'], ['w.enable', 1]]);

    const empty = makeLayers([OBJECTS[1]]);
    await empty.layers.toggleW();
    assert.deepEqual(empty.messages, ['Нет данных по влажности']);
});

test('refresh: пересчитывает включённые слои, выключает при пустых данных', async () => {
    const { store, layers, log } = makeLayers(OBJECTS);
    patchSlice(store, 'layers', { il: true, w: true });

    await layers.refresh(OBJECTS);
    assert.deepEqual(log, [['il.enable', 1], ['w.enable', 1]]);

    log.length = 0;
    await layers.refresh([OBJECTS[1]]);
    assert.deepEqual(log, [['il.disable'], ['w.disable']]);
    assert.deepEqual(store.getState().layers, { il: false, w: false });
});

test('goToObject: пустой ввод игнорируется, найденный объект фокусируется, ненайденный -> сообщение', () => {
    const { layers, log, messages } = makeLayers(OBJECTS);
    layers.goToObject('   ');
    layers.goToObject(' A ');
    layers.goToObject('ZZZ');
    assert.deepEqual(log, [['focus', 'A'], ['focus', 'ZZZ']]);
    assert.deepEqual(messages, ['Объект с ID "ZZZ" не найден']);
});

// ---------- date.actions ----------

test('applyDate: обновляет профиль, маркеры и слои одним запросом объектов', async () => {
    const store = createStore(createInitialState());
    const calls = [];
    const date = createDateActions({
        store,
        chartActions: { loadProfile: (id) => calls.push(['profile', id]) },
        objectsActions: { loadObjects: async () => (calls.push(['objects']), OBJECTS) },
        mapActions: { refresh: async (o) => calls.push(['refresh', o.length]) }
    });

    date.setDateInput('2026-06-01T09:55');
    assert.equal(store.getState().date.input, '2026-06-01T09:55');

    await date.applyDate(); // объект не выбран — профиль не грузится
    assert.deepEqual(calls, [['objects'], ['refresh', 2]]);

    calls.length = 0;
    patchSlice(store, 'chart', { selectedObjectId: 'A' });
    await date.applyDate();
    assert.deepEqual(calls, [['profile', 'A'], ['objects'], ['refresh', 2]]);
});

// ---------- auth.actions ----------

test('auth: вход, ошибка входа, выход и восстановление сессии', async () => {
    const store = createStore(createInitialState());
    let saved = null;
    let cleared = false;
    let reloaded = false;
    const session = {
        load: () => saved,
        save: (u) => (saved = u),
        clear: () => (cleared = true)
    };
    const api = {
        requestLogin: async (u, p) =>
            p === 'ok'
                ? { success: true, role: 'engineer', username: u }
                : { success: false, message: 'Неверный логин или пароль' }
    };
    const auth = createAuthActions({ store, api, session, reload: () => (reloaded = true) });

    assert.deepEqual(await auth.login('dina', 'bad'), { ok: false, message: 'Неверный логин или пароль' });
    assert.equal(store.getState().auth.user, null);

    assert.deepEqual(await auth.login('dina', 'ok'), { ok: true });
    assert.deepEqual(store.getState().auth.user, { username: 'dina', role: 'engineer' });
    assert.deepEqual(saved, { username: 'dina', role: 'engineer' });

    const fresh = createStore(createInitialState());
    createAuthActions({ store: fresh, api, session, reload() {} }).restoreSession();
    assert.equal(fresh.getState().auth.user.username, 'dina');

    auth.logout();
    assert.ok(cleared && reloaded);
});
