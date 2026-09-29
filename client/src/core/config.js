// Все "магические числа" проекта в одном месте.

// --- Карта ---
export const MAP_CONFIG = {
    center: [51.1228, 71.4271], // Астана
    zoom: 13,
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap'
};

// --- Время ---
// input[type=datetime-local] хранит "наивное" время — ровно то, что выбрано в календаре,
// БЕЗ часового пояса. Это время по Алматы. Алматы всегда UTC+5 (без летнего времени),
// поэтому смещение можно зашить константой.
export const ALMATY_UTC_OFFSET = '+05:00';
export const DEFAULT_DATE_INPUT = '2026-05-05T12:00';

// --- Тренд ---
export const TREND_LIMIT = 50;

// --- Индекс IL ---
// IL <= normalMax — норма, IL <= riskMax — риск, выше — подтопление
export const IL_THRESHOLDS = { normalMax: 0, riskMax: 1 };
// Диапазон, в который обрезается предсказание кригинга перед раскраской
export const IL_RANGE = { min: -2, max: 3 };

// --- Влажность W (%) ---
export const W_THRESHOLDS = { low: 20, high: 30 };

// --- Кригинг ---
export const KRIGING_PARAMS = { model: 'exponential', sigma2: 0, alpha: 100 };

// Точка отсчёта локальной плоской проекции (метры от центра Астаны)
export const PROJECTION = {
    earthRadius: 6378137,
    refLat: 51.1228,
    refLng: 71.4271
};

// --- Растровые слои ---
export const IL_SURFACE = { scale: 4, layerOpacity: 0.6, overlayOpacity: 0.75, zIndex: 5 };
export const W_LAYER = { scale: 2, radiusMeters: 300, background: 'rgba(254, 249, 195, 0.5)', zIndex: 5 };

// --- Ключи localStorage ---
export const STORAGE_KEYS = { currentUser: 'currentUser' };

// --- Роли ---
export const ROLES = { USER: 'user', ENGINEER: 'engineer', ADMIN: 'admin' };
