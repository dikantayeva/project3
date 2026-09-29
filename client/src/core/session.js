import { STORAGE_KEYS } from './config.js';

// Сессия входа хранится в браузере, чтобы после перезагрузки не логиниться заново.
// Единственное место, которое знает про localStorage.
// (Когда появятся серверные сессии/токены — меняется только этот файл.)

export function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveSession(user) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
}
