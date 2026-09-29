import { watch } from '../../core/store.js';
import { qs } from '../../core/dom.js';

/**
 * Кнопка "Войти" / имя пользователя + "Выйти" и модальное окно авторизации.
 * Модальное окно — локальное состояние view (открыто/закрыто), в общий store оно не нужно.
 */
export function mountAuthBar(el, { store, authActions }) {
    el.innerHTML = `
        <div style="position: absolute; top: 10px; right: 20px; z-index: 1000;">
            <button data-login-btn style="padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Войти</button>
            <span data-user-info style="display: none; background: white; padding: 5px 10px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></span>
            <button data-logout-btn style="display: none; margin-left: 5px; padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Выйти</button>
        </div>

        <div data-modal style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; width: 300px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                <h3>Авторизация</h3>
                <input data-username type="text" placeholder="Логин" style="width: 100%; margin-bottom: 10px; padding: 8px; box-sizing: border-box;">
                <input data-password type="password" placeholder="Пароль" style="width: 100%; margin-bottom: 15px; padding: 8px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between;">
                    <button data-submit style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Войти</button>
                    <button data-cancel style="padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
                </div>
                <p data-error style="color: red; font-size: 12px; margin-top: 10px;"></p>
            </div>
        </div>
    `;

    const loginBtn = qs(el, '[data-login-btn]');
    const userInfo = qs(el, '[data-user-info]');
    const logoutBtn = qs(el, '[data-logout-btn]');
    const modal = qs(el, '[data-modal]');
    const usernameInput = qs(el, '[data-username]');
    const passwordInput = qs(el, '[data-password]');
    const errorEl = qs(el, '[data-error]');

    const openModal = () => {
        modal.style.display = 'flex';
    };
    const closeModal = () => {
        modal.style.display = 'none';
        errorEl.innerText = '';
    };

    async function submit() {
        const result = await authActions.login(usernameInput.value.trim(), passwordInput.value);
        if (result.ok) closeModal();
        else errorEl.innerText = result.message;
    }

    loginBtn.addEventListener('click', openModal);
    logoutBtn.addEventListener('click', () => authActions.logout());
    qs(el, '[data-submit]').addEventListener('click', submit);
    qs(el, '[data-cancel]').addEventListener('click', closeModal);

    // Вид панели целиком определяется тем, есть ли пользователь в состоянии
    return watch(store, [(s) => s.auth.user], (user) => {
        loginBtn.style.display = user ? 'none' : '';
        userInfo.style.display = user ? 'inline-block' : 'none';
        logoutBtn.style.display = user ? 'inline-block' : 'none';
        if (user) userInfo.innerText = `${user.username} (${user.role})`;
    });
}
