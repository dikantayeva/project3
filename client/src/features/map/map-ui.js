import L from 'leaflet';
import { escapeHtml } from '../../core/dom.js';
import { IL_CLASSES, getIlClass } from '../il/il.js';
import { ilColorStopsToCssGradient } from '../interpolation/colorScale.js';

// Всё "оформление" карты, которое строится из HTML-строк: подсказки и легенда.

// ---------- Подсказки ----------

/** Содержимое всплывающего окна маркера объекта */
export function objectPopupHtml(obj) {
    const cls = getIlClass(obj.avg_il);
    const hasIl = obj.avg_il !== null;
    const hasW = obj.avg_w !== null;

    const displayIL = hasIl ? obj.avg_il : 'нет данных';
    const displayW = hasW ? obj.avg_w + '%' : 'нет данных';

    return `
        <div style="text-align: center; font-family: sans-serif;">
            <b style="font-size: 14px;">Объект: ${escapeHtml(obj.object_id)}</b><br>
            <hr style="margin: 5px 0;">
            <div style="text-align: left; font-size: 12px;">
                Глубина расчета (N): ${escapeHtml(obj.n_levels)}<br>
                <b>Средний IL:</b> ${escapeHtml(displayIL)} <br>
                <b>Средний W:</b> <span>${escapeHtml(displayW)}</span>
            </div>
            <hr style="margin: 5px 0;">
            <span style="color: ${cls.markerColor}; font-weight: bold;">${cls.labelEn}</span>
        </div>
    `;
}

/** Содержимое подсказки при клике по слою кригинга */
export function krigingPopupHtml(predictedIL) {
    const cls = getIlClass(predictedIL);

    return `
        <div style="font-family:sans-serif;font-size:13px;text-align:center;">
            <b>Прогноз Average IL:</b> ${predictedIL.toFixed(3)}<br>
            <span style="color:${cls.textColor};font-weight:bold;">${cls.labelRu}</span><br>
            <span style="font-size:10px;color:#888;">Кригинг-интерполяция — реального датчика здесь нет</span>
        </div>
    `;
}

// ---------- Легенда ----------

const dot = (color) =>
    `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${color};margin-right:7px;"></span>`;

const swatch = (rgba) =>
    `<span style="display:inline-block;width:14px;height:11px;background:${rgba};margin-right:7px;"></span>`;

// Постоянная часть легенды: цвета точек объектов
const STATIC_HTML = `
    <b style="display:block;margin-bottom:6px;font-size:13px;">Точки объектов (IL)</b>
    <div>${dot(IL_CLASSES.normal.markerColor)}Норма (IL ≤ 0)</div>
    <div>${dot(IL_CLASSES.risk.markerColor)}Риск (0 &lt; IL ≤ 1)</div>
    <div>${dot(IL_CLASSES.flood.markerColor)}Подтопление (IL &gt; 1)</div>
    <div>${dot(IL_CLASSES.nodata.markerColor)}Нет данных</div>
`;

const IL_LAYER_HTML = `
    <b style="display:block;margin-bottom:6px;font-size:13px;">Слой: Average IL (растр, кригинг)</b>
    <div style="height:12px;border-radius:3px;background:${ilColorStopsToCssGradient()};margin-bottom:3px;"></div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#666;">
        <span>-2 (сухо)</span>
        <span>0</span>
        <span>1</span>
        <span>3 (подтопление)</span>
    </div>
`;

const W_LAYER_HTML = `
    <b style="display:block;margin-bottom:6px;font-size:13px;">Слой: Average W</b>
    <div>${swatch('rgba(239,68,68,0.6)')}W &lt; 20%</div>
    <div>${swatch('rgba(185,28,28,0.6)')}20% ≤ W &lt; 30%</div>
    <div>${swatch('rgba(127,29,29,0.6)')}W ≥ 30%</div>
`;

/**
 * Легенда карты (правый нижний угол). update({ il, w }) показывает пояснение
 * активного слоя; при включённом IL он приоритетнее W (как в исходной версии).
 */
export function createLegendControl() {
    const control = L.control({ position: 'bottomright' });
    let layerSection = null;

    control.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div style="background:white;padding:10px 12px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-family:sans-serif;font-size:12px;line-height:1.7;min-width:170px;">
                ${STATIC_HTML}
                <div data-legend-layer style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;"></div>
            </div>
        `;
        layerSection = div.querySelector('[data-legend-layer]');
        L.DomEvent.disableClickPropagation(div);
        return div;
    };

    control.update = function ({ il, w }) {
        if (!layerSection) return;

        if (il) {
            layerSection.style.display = 'block';
            layerSection.innerHTML = IL_LAYER_HTML;
        } else if (w) {
            layerSection.style.display = 'block';
            layerSection.innerHTML = W_LAYER_HTML;
        } else {
            layerSection.style.display = 'none';
            layerSection.innerHTML = '';
        }
    };

    return control;
}
