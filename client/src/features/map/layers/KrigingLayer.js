import L from 'leaflet';
import { IL_RANGE, IL_SURFACE } from '../../../core/config.js';
import { trainModel, predictAt } from '../../interpolation/kriging.js';
import { ilValueToColor } from '../../interpolation/colorScale.js';
import { krigingPopupHtml } from '../map-ui.js';

/**
 * Растровый слой прогноза IL (кригинг).
 * enable(points) обучает модель и рисует поверхность на ВЕСЬ видимый охват карты;
 * слой сам перерисовывается при панорамировании/зуме и показывает прогноз по клику.
 */
export class KrigingLayer {
    constructor(map) {
        this.map = map;
        this.model = null; // обученная модель кригинга
        this.overlay = null; // L.imageOverlay с растром

        this.onMoveEnd = () => {
            if (this.overlay && this.model) this.#redraw();
        };
        this.onClick = (e) => {
            if (!this.overlay || !this.model) return;

            const predicted = predictAt(this.model, e.latlng.lat, e.latlng.lng);
            L.popup().setLatLng(e.latlng).setContent(krigingPopupHtml(predicted)).openOn(this.map);
        };

        map.on('moveend', this.onMoveEnd);
        map.on('click', this.onClick);
    }

    /** Обучает модель на новых точках и рисует слой (повторный вызов = пересчёт) */
    enable(points) {
        this.model = trainModel(points);
        this.#redraw();
    }

    disable() {
        if (this.overlay) this.map.removeLayer(this.overlay);
        this.overlay = null;
        this.model = null;
    }

    destroy() {
        this.disable();
        this.map.off('moveend', this.onMoveEnd);
        this.map.off('click', this.onClick);
    }

    #redraw() {
        if (this.overlay) this.map.removeLayer(this.overlay);
        this.overlay = this.#drawSurface();
        this.overlay.addTo(this.map);
    }

    #drawSurface() {
        const { scale, overlayOpacity, zIndex } = IL_SURFACE;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = this.map.getSize();
        canvas.width = size.x / scale;
        canvas.height = size.y / scale;

        for (let py = 0; py < canvas.height; py++) {
            for (let px = 0; px < canvas.width; px++) {
                const latlng = this.map.containerPointToLatLng(L.point(px * scale, py * scale));
                let val = predictAt(this.model, latlng.lat, latlng.lng);

                if (val < IL_RANGE.min) val = IL_RANGE.min;
                if (val > IL_RANGE.max) val = IL_RANGE.max;

                ctx.fillStyle = ilValueToColor(val);
                ctx.fillRect(px, py, 1, 1);
            }
        }

        return L.imageOverlay(canvas.toDataURL(), this.map.getBounds(), {
            opacity: overlayOpacity,
            interactive: false,
            zIndex
        });
    }
}
