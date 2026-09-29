import { PROJECTION } from '../../core/config.js';

/**
 * lat/lng -> локальные метровые координаты (плоская проекция вокруг центра Астаны).
 * НЕ зависит от текущего зума/панорамирования карты, поэтому модель кригинга
 * не нужно переобучать при движении карты.
 */
export function projectLatLng(lat, lng) {
    const { earthRadius, refLat, refLng } = PROJECTION;
    const x = ((lng - refLng) * Math.PI) / 180 * earthRadius * Math.cos((refLat * Math.PI) / 180);
    const y = ((lat - refLat) * Math.PI) / 180 * earthRadius;
    return [x, y];
}

/** Сколько метров в одном пикселе карты на данной широте и зуме (Web Mercator) */
export function metersPerPixel(lat, zoom) {
    return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}
