import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyIl, getIlClass } from '../src/features/il/il.js';
import { toApiDate } from '../src/features/date/dates.js';
import { objectsToPoints } from '../src/features/objects/objects.actions.js';
import { projectLatLng, metersPerPixel } from '../src/features/interpolation/geo.js';
import { ilValueToRgb, ilValueToColor, wValueToRgb, IL_COLOR_STOPS } from '../src/features/interpolation/colorScale.js';
import { arrayToCSV, PROFILE_COLUMNS } from '../src/features/export/export.actions.js';
import { buildChartConfig } from '../src/features/chart/chart.configs.js';
import { W_THRESHOLDS, PROJECTION } from '../src/core/config.js';

test('classifyIl: границы 0 и 1, строки из PostgreSQL, null', () => {
    assert.equal(classifyIl(-0.5), 'normal');
    assert.equal(classifyIl(0), 'normal');
    assert.equal(classifyIl('0.5'), 'risk');
    assert.equal(classifyIl(1), 'risk');
    assert.equal(classifyIl('1.0001'), 'flood');
    assert.equal(classifyIl(null), 'nodata');
    assert.equal(classifyIl(undefined), 'nodata');
    assert.equal(getIlClass(2).labelRu, 'Подтопление');
});

test('toApiDate: время по Алматы, пустое поле -> пустая строка', () => {
    assert.equal(toApiDate('2026-05-05T12:00'), '2026-05-05T12:00:00+05:00');
    assert.equal(toApiDate(''), '');
});

test('objectsToPoints: отбрасывает null, приводит строки к числам', () => {
    const objects = [
        { object_id: 'A', lat: '51.1', lng: '71.4', avg_il: '0.25', avg_w: null },
        { object_id: 'B', lat: 51.2, lng: 71.5, avg_il: null, avg_w: '22.5' }
    ];
    assert.deepEqual(objectsToPoints(objects, 'avg_il'), [[51.1, 71.4, 0.25]]);
    assert.deepEqual(objectsToPoints(objects, 'avg_w'), [[51.2, 71.5, 22.5]]);
});

test('projectLatLng: центр проекции = (0, 0), север даёт +y, восток +x', () => {
    const [x0, y0] = projectLatLng(PROJECTION.refLat, PROJECTION.refLng);
    assert.equal(x0, 0);
    assert.equal(y0, 0);
    const [, yN] = projectLatLng(PROJECTION.refLat + 0.01, PROJECTION.refLng);
    const [xE] = projectLatLng(PROJECTION.refLat, PROJECTION.refLng + 0.01);
    assert.ok(yN > 1000 && yN < 1200); // ~1.11 км на 0.01°
    assert.ok(xE > 600 && xE < 800); // на 51° широты долгота "короче"
});

test('metersPerPixel: на экваторе при zoom 0 — 156543 м/px', () => {
    assert.ok(Math.abs(metersPerPixel(0, 0) - 156543.03392) < 1e-6);
});

test('ilValueToRgb: края шкалы, плато зон и середина перехода', () => {
    assert.deepEqual(ilValueToRgb(-10), IL_COLOR_STOPS[0].color);
    assert.deepEqual(ilValueToRgb(10), IL_COLOR_STOPS.at(-1).color);
    assert.deepEqual(ilValueToRgb(0.5), [234, 179, 8]); // жёлтое плато
    // середина перехода зелёный -> жёлтый (между -0.15 и 0.15) — ровно среднее
    assert.deepEqual(ilValueToRgb(0), [134, 188, 51]);
    assert.equal(ilValueToColor(0.5, 0.6), 'rgba(234, 179, 8, 0.6)');
});

test('wValueToRgb: три ступени по порогам 20 / 30', () => {
    assert.equal(wValueToRgb(19.9, W_THRESHOLDS), '239, 68, 68');
    assert.equal(wValueToRgb(20, W_THRESHOLDS), '185, 28, 28');
    assert.equal(wValueToRgb(30, W_THRESHOLDS), '127, 29, 29');
});

test('arrayToCSV: разделитель ; и экранирование ; в значениях, null -> пусто', () => {
    const csv = arrayToCSV(
        [{ sensor_id: 's;1', depth_m: -3, timestamp: null, w_percent: 20, wl_value: 1, wp_value: 2, il_value: 0.5 }],
        PROFILE_COLUMNS
    );
    assert.equal(
        csv,
        'sensor_id;depth_m;timestamp;w_percent;wl_value;wp_value;il_value\ns,1;-3;;20;1;2;0.5'
    );
});

test('buildChartConfig: профиль, тренд и пустое состояние', () => {
    const rows = [
        { il_value: -0.2, depth_m: -1, timestamp: '2026-05-05T07:00:00Z' },
        { il_value: null, depth_m: -2, timestamp: '2026-05-05T08:00:00Z' }
    ];
    const profile = buildChartConfig({ view: 'profile', rows });
    assert.deepEqual(profile.data.datasets[0].data, [{ x: -0.2, y: -1 }, { x: null, y: -2 }]);
    assert.deepEqual(profile.data.datasets[0].pointBackgroundColor, ['#22c55e', '#94a3b8']);

    const trend = buildChartConfig({ view: 'trend', rows });
    assert.equal(trend.data.labels.length, 2);
    assert.deepEqual(trend.data.datasets[0].data, [-0.2, null]);

    assert.equal(buildChartConfig({ view: 'none', rows: [] }), null);
});
