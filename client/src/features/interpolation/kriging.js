import * as krigingModule from '@sakitam-gis/kriging';
import { KRIGING_PARAMS } from '../../core/config.js';
import { projectLatLng } from './geo.js';

/**
 * Адаптер к библиотеке кригинга — ЕДИНСТВЕННОЕ место проекта, которое её импортирует.
 * Если библиотеку заменят (другой пакет, вычисления на сервере, Web Worker),
 * менять нужно только этот файл: остальной код видит лишь trainModel / predictAt.
 *
 * Раньше библиотека подключалась через <script> и жила в глобальной переменной `kriging`.
 * В npm-версии форма экспорта может отличаться (named / default), поэтому ищем train/predict
 * во всех обычных местах.
 */
function resolveLibrary() {
    const candidates = [krigingModule, krigingModule.default, krigingModule.default?.default, globalThis.kriging];
    const lib = candidates.find((c) => c && typeof c.train === 'function' && typeof c.predict === 'function');
    if (!lib) {
        throw new Error(
            'Не удалось найти kriging.train / kriging.predict в пакете @sakitam-gis/kriging. ' +
            'Проверьте форму экспорта пакета (см. client/src/features/interpolation/kriging.js).'
        );
    }
    return lib;
}

/**
 * Обучает модель на реальных координатах объектов (в метрах).
 * @param {Array<[number, number, number]>} points  [lat, lng, значение]
 * @returns {object} обученная модель (variogram) — передаётся в predictAt
 */
export function trainModel(points) {
    const lib = resolveLibrary();

    const values = points.map((p) => p[2]);
    const coords = points.map((p) => projectLatLng(p[0], p[1]));
    const xs = coords.map((c) => c[0]);
    const ys = coords.map((c) => c[1]);

    const { model, sigma2, alpha } = KRIGING_PARAMS;
    return lib.train(values, xs, ys, model, sigma2, alpha);
}

/** Предсказанное значение в точке карты (lat/lng) */
export function predictAt(model, lat, lng) {
    const [x, y] = projectLatLng(lat, lng);
    return resolveLibrary().predict(x, y, model);
}
