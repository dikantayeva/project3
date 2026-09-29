import { IL_SURFACE } from '../../core/config.js';

// Опорные точки шкалы IL -> цвет (RGB). Диапазон -2..3 совпадает с тем, в который
// значение обрезается перед раскраской (IL_RANGE в config.js). Между соседними точками
// цвет плавно интерполируется линейно — получается непрерывный градиент на КАЖДЫЙ пиксель
// (как настоящий растр кригинга в QGIS): границы между зонами не рисуются отдельно —
// они сами проявляются там, где реально меняются предсказанные значения IL.
//
// У каждой смысловой границы (0, 1, 2) — узкая "парная" точка по обе стороны (±0.15),
// поэтому чистый оттенок каждой зоны держится почти на всём её диапазоне, а смешение
// двух цветов сжато в узкую полосу вокруг границы.
export const IL_COLOR_STOPS = [
    { value: -2, color: [21, 128, 61] }, // тёмно-зелёный — явная норма
    { value: -0.15, color: [34, 197, 94] }, // зелёный — пик чуть раньше границы 0
    { value: 0.15, color: [234, 179, 8] }, // жёлтый — пик чуть позже границы 0
    { value: 0.85, color: [234, 179, 8] }, // жёлтый держится до границы 1
    { value: 1.15, color: [239, 68, 68] }, // красный — пик чуть позже границы 1
    { value: 1.85, color: [239, 68, 68] }, // красный держится до границы 2
    { value: 2.15, color: [127, 29, 29] }, // тёмно-бордовый — пик чуть позже границы 2
    { value: 3, color: [127, 29, 29] } // тёмно-бордовый — сильное подтопление
];

/** Значение IL -> [r, g, b] (плавный градиент между опорными точками) */
export function ilValueToRgb(val, stops = IL_COLOR_STOPS) {
    if (val <= stops[0].value) return stops[0].color;

    const last = stops[stops.length - 1];
    if (val >= last.value) return last.color;

    for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (val >= a.value && val <= b.value) {
            const t = (val - a.value) / (b.value - a.value);
            return [
                Math.round(a.color[0] + t * (b.color[0] - a.color[0])),
                Math.round(a.color[1] + t * (b.color[1] - a.color[1])),
                Math.round(a.color[2] + t * (b.color[2] - a.color[2]))
            ];
        }
    }
    return last.color;
}

/** Значение IL -> CSS-цвет 'rgba(r, g, b, opacity)' для закраски пикселя растра */
export function ilValueToColor(val, opacity = IL_SURFACE.layerOpacity) {
    const [r, g, b] = ilValueToRgb(val);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** CSS linear-gradient той же шкалы — для полоски-легенды */
export function ilColorStopsToCssGradient(stops = IL_COLOR_STOPS) {
    const min = stops[0].value;
    const max = stops[stops.length - 1].value;
    const parts = stops.map((s) => {
        const pct = ((s.value - min) / (max - min)) * 100;
        const [r, g, b] = s.color;
        return `rgb(${r}, ${g}, ${b}) ${pct.toFixed(1)}%`;
    });
    return `linear-gradient(to right, ${parts.join(', ')})`;
}

/** Цвет ореола слоя W (RGB-строка "r, g, b") по значению влажности */
export function wValueToRgb(val, thresholds) {
    if (val < thresholds.low) return '239, 68, 68'; // ярко-красный (Red 500)
    if (val < thresholds.high) return '185, 28, 28'; // насыщенный тёмно-красный (Red 700)
    return '127, 29, 29'; // глубокий бордовый (Red 900)
}
