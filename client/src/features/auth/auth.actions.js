import { patchSlice } from '../../core/store.js';

export function createAuthActions({ store, api, session, reload }) {
    /** @returns {Promise<{ ok: boolean, message?: string }>} */
    async function login(username, password) {
        try {
            const data = await api.requestLogin(username, password);

            if (data.success) {
                const user = { username: data.username, role: data.role };
                session.save(user);
                patchSlice(store, 'auth', { user });
                return { ok: true };
            }
            return { ok: false, message: data.message };
        } catch (err) {
            console.error('Ошибка входа:', err);
            return { ok: false, message: 'Ошибка соединения с сервером' };
        }
    }

    function logout() {
        session.clear();
        // Как и раньше — перезагружаем страницу, чтобы сбросить всё состояние
        reload();
    }

    /** Автопроверка сессии при загрузке страницы */
    function restoreSession() {
        const user = session.load();
        if (user) patchSlice(store, 'auth', { user });
    }

    return { login, logout, restoreSession };
}
