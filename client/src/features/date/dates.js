import { ALMATY_UTC_OFFSET } from '../../core/config.js';

/**
 * Значение поля datetime-local ('2026-05-05T12:00') -> строка для сервера
 * ('2026-05-05T12:00:00+05:00'). Пустое поле -> '' (сервер тогда не фильтрует по дате).
 *
 * ВАЖНО: раньше здесь стояло ':00Z' — выбранные 9:55 сервер читал как "9:55 UTC"
 * (= 14:55 по Алматы), из-за чего фильтр "уезжал" на 5 часов.
 */
export function toApiDate(dateInput) {
    return dateInput ? `${dateInput}:00${ALMATY_UTC_OFFSET}` : '';
}

/** Подпись оси времени на графике тренда: '05.05, 12:00' */
export function formatTrendLabel(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
