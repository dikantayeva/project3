/**
 * Весь обмен с сервером в одном файле: тонкая обёртка над fetch + по функции на каждый эндпоинт.
 * Экшены получают эти функции параметром (`api`), поэтому в тестах их подменяют заглушками,
 * а при переходе на React их можно оставить как есть или обернуть в React Query (useQuery).
 */

async function getJson(path, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });

    const qs = query.toString();
    const url = qs ? `${path}?${qs}` : path;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Сервер вернул ошибку: ${response.status}`);
    }
    return response.json();
}

async function postJson(path, body) {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    // Для /api/login тело ответа нужно и при 401 (там сообщение "Неверный логин или пароль")
    return response.json();
}

// --- Карта ---

/** GET /api/objects?date=...  — объекты с координатами и средними IL / W на момент времени */
export function fetchObjects(date) {
    return getJson('/api/objects', { date });
}

// --- Графики ---

/** GET /api/object-details/:id?date=...  — показания всех датчиков объекта (профиль по глубине) */
export function fetchObjectDetails(objectId, date) {
    return getJson(`/api/object-details/${encodeURIComponent(objectId)}`, { date });
}

/** GET /api/sensor-trend/:id?limit=N  — история измерений одного датчика */
export function fetchSensorTrend(sensorId, limit) {
    return getJson(`/api/sensor-trend/${encodeURIComponent(sensorId)}`, { limit });
}

// --- Авторизация ---

/** POST /api/login  ->  { success, role, username, message } */
export function requestLogin(username, password) {
    return postJson('/api/login', { username, password });
}
