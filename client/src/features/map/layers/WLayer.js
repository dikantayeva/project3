import L from 'leaflet';
import { W_LAYER, W_THRESHOLDS } from '../../../core/config.js';
import { metersPerPixel } from '../../interpolation/geo.js';
import { wValueToRgb } from '../../interpolation/colorScale.js';

/**
 * Слой средней влажности W: вокруг каждого объекта — радиальный ореол.
 * Это визуализация, а не интерполяция (кригинг тут не используется).
 * Как и в исходной версии, растр рисуется один раз на текущий охват карты
 * (при панорамировании не пересчитывается — только при enable()).
 */
export class WLayer {
    constructor(map) {
        this.map = map;
        this.overlay = null;
    }

    /** Рисует слой на текущий охват карты (повторный вызов = перерисовка) */
    enable(points) {
        this.disable();
        this.overlay = this.#draw(points);
        this.overlay.addTo(this.map);
    }

    disable() {
        if (this.overlay) this.map.removeLayer(this.overlay);
        this.overlay = null;
    }

    #draw(points) {
        const { scale, radiusMeters, background, zIndex } = W_LAYER;
        const map = this.map;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = map.getSize();
        canvas.width = size.x / scale;
        canvas.height = size.y / scale;

        // Светло-жёлтый фон
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Радиус ореола задан в МЕТРАХ и пересчитан в пиксели под текущий зум,
        // поэтому размер пятна на местности не зависит от масштаба карты
        const mpp = metersPerPixel(map.getCenter().lat, map.getZoom());
        const radius = radiusMeters / mpp / scale;

        points.forEach(([lat, lng, val]) => {
            const cp = map.latLngToContainerPoint([lat, lng]);
            const x = cp.x / scale;
            const y = cp.y / scale;

            const color = wValueToRgb(val, W_THRESHOLDS);

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${color}, 0.9)`);
            gradient.addColorStop(0.4, `rgba(${color}, 0.5)`);
            gradient.addColorStop(1, `rgba(${color}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        return L.imageOverlay(canvas.toDataURL(), map.getBounds(), {
            opacity: 1,
            interactive: false,
            zIndex
        });
    }
}
