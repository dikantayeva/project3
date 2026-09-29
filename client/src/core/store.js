/**
 * Минимальное хранилище состояния (аналог zustand / redux, но на 40 строк).
 *
 * Состояние — обычный объект, который НИКОГДА не мутируется: каждое изменение
 * создаёт новый объект. Благодаря этому подписчики сравнивают значения по ссылке,
 * а при переходе на React хранилище подключается через useSyncExternalStore
 * (или заменяется на zustand — API почти совпадает).
 */
export function createStore(initialState) {
    let state = initialState;
    const listeners = new Set();

    return {
        getState: () => state,

        /** updater — функция (state) => newState, либо частичный объект */
        setState(updater) {
            const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
            if (next === state) return;
            state = next;
            listeners.forEach((listener) => listener(state));
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}

/** Обновляет один "срез" состояния: patchSlice(store, 'chart', { mode: 'trend' }) */
export function patchSlice(store, key, patch) {
    store.setState((state) => ({
        ...state,
        [key]: { ...state[key], ...(typeof patch === 'function' ? patch(state[key]) : patch) }
    }));
}

/**
 * Подписка на часть состояния. Колбэк вызывается только когда изменился хотя бы один
 * из выбранных селекторами кусков (сравнение по ссылке).
 *
 *   watch(store, [s => s.layers.il, s => s.layers.w], (il, w) => ...)
 *
 * Аналог useEffect(() => {...}, [il, w]) в React.
 */
export function watch(store, selectors, callback, { immediate = true } = {}) {
    const read = (state) => selectors.map((select) => select(state));
    let prev = read(store.getState());

    if (immediate) callback(...prev);

    return store.subscribe((state) => {
        const next = read(state);
        const changed = next.some((value, i) => !Object.is(value, prev[i]));
        if (!changed) return;
        prev = next;
        callback(...next);
    });
}
