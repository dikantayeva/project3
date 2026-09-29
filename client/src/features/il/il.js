import { IL_THRESHOLDS } from '../../core/config.js';

// Классы значения IL и всё, что с ними связано (цвета, подписи).
// Чистые данные и функции — без DOM и без библиотек.
export const IL_CLASSES = {
    normal: {
        markerColor: '#22c55e', // маркер на карте и точка на графике
        borderColor: '#166534', // обводка точки на графике
        textColor: '#16a34a', // текст статуса в подсказках
        labelEn: '(Normal)',
        labelRu: 'Норма'
    },
    risk: {
        markerColor: '#eab308',
        borderColor: '#854d0e',
        textColor: '#ca8a04',
        labelEn: '(Risk)',
        labelRu: 'Риск'
    },
    flood: {
        markerColor: '#ef4444',
        borderColor: '#991b1b',
        textColor: '#dc2626',
        labelEn: '(Waterlogging)',
        labelRu: 'Подтопление'
    },
    nodata: {
        markerColor: '#94a3b8',
        borderColor: '#64748b',
        textColor: '#64748b',
        labelEn: '',
        labelRu: 'Нет данных'
    }
};

/**
 * 'normal' | 'risk' | 'flood' | 'nodata'.
 * Значения из PostgreSQL (numeric) приходят строками ("0.5") — приводим к числу.
 */
export function classifyIl(il) {
    if (il === null || il === undefined || il === '') return 'nodata';
    const value = Number(il);
    if (Number.isNaN(value)) return 'nodata';
    if (value <= IL_THRESHOLDS.normalMax) return 'normal';
    if (value <= IL_THRESHOLDS.riskMax) return 'risk';
    return 'flood';
}

export function getIlClass(il) {
    return IL_CLASSES[classifyIl(il)];
}
