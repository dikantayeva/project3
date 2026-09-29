# Архитектура проекта

Проект разделён на две независимые части: **server/** (Node.js + Express + PostgreSQL, отдаёт JSON API) и **client/** (браузерный интерфейс на Vite + ES-модулях). Клиент общается с сервером только по HTTP (`/api/*`), поэтому части можно менять независимо.

Главная идея клиента: **логика отделена от отображения**. Всё, что решает «что показывать» (состояние, экшены, расчёты), не знает ни про DOM, ни про Leaflet, ни про Chart.js. Отображение (view) и работа с картой — тонкие слои сверху. Благодаря этому переход на React сводится к замене слоя view, а логика остаётся как есть.

## Структура

```
soil-monitoring/
├─ package.json            зависимости и скрипты бэкенда
├─ .env.example            переменные окружения (скопировать в .env)
├─ data/sensors/           исходные CSV с показаниями (47 файлов, по одному на объект)
├─ legacy/                 ранний прототип (sensor.html, data.json) — не используется
├─ server/
│  ├─ index.js             точка входа: проверка БД + listen
│  ├─ app.js               создаёт Express-приложение (json, /api, статика)
│  ├─ config/env.js        чтение .env: порт, подключение к БД, папка статики
│  ├─ db/pool.js           пул соединений pg, часовой пояс Asia/Almaty
│  ├─ routes/index.js      таблица URL -> контроллер (все маршруты в одном месте)
│  ├─ controllers/         разбор запроса и формирование ответа (HTTP-слой)
│  │   ├─ monitoring.controller.js   GET  /api/objects, /api/object-details/:id, /api/sensor-trend/:id
│  │   ├─ auth.controller.js         POST /api/login
│  │   └─ telemetry.controller.js    POST /api/telemetry, /api/telemetry/batch
│  └─ services/            SQL-запросы и работа с БД (никакого req/res)
│      ├─ monitoring.service.js      объекты на карте, профиль по глубине, тренд датчика
│      ├─ auth.service.js            поиск пользователя, проверка пароля
│      └─ telemetry.service.js       проверка входящих показаний + запись в БД
│
└─ client/
   ├─ index.html, vite.config.js, tailwind.config.js, postcss.config.js
   ├─ tests/               юнит-тесты логики (node --test, без браузера)
   └─ src/
      ├─ main.js           подключает стили и запускает bootstrap
      ├─ app/
      │   ├─ bootstrap.js  composition root: собирает store, экшены, карту, view
      │   └─ layout.js     каркас страницы со «слотами», показ дашборда после входа
      ├─ core/             инфраструктура, не зависит от фич
      │   ├─ config.js     ВСЕ константы: центр карты, пороги IL/W, параметры кригинга…
      │   ├─ store.js      мини-хранилище: createStore, patchSlice, watch
      │   ├─ initialState.js  форма состояния приложения
      │   ├─ api.js        весь обмен с сервером: fetch-обёртка + функция на каждый эндпоинт
      │   ├─ session.js    localStorage (единственное место)
      │   └─ dom.js        qs, escapeHtml, downloadCsv
      ├─ features/         код сгруппирован по возможностям, а не по типам файлов
      │   ├─ auth/         auth.actions · auth.view
      │   ├─ date/         dates (чистые) · date.actions · date.view
      │   ├─ objects/      objects.actions (+ objectsToPoints)
      │   ├─ chart/        chart.actions · chart.configs (чистые) · chart.view (панель управления + график)
      │   ├─ export/       export.actions (+ arrayToCSV, колонки CSV)
      │   ├─ il/           il.js — классификация IL, цвета, подписи
      │   ├─ interpolation/  geo · kriging (адаптер к библиотеке) · colorScale
      │   └─ map/          MapController (карта + связка со store) · map.actions (слои и поиск)
      │                    layers/{MarkersLayer,KrigingLayer,WLayer}
      │                    map-ui (подсказки и легенда) · map-toolbar.view
      └─ styles/main.css   Tailwind + несколько своих правил
```

## Слои и правила зависимостей

Внутри `features/*` файлы делятся на роли по суффиксу имени:

| Суффикс / тип | Что это | Можно ли импортировать DOM, Leaflet, Chart.js |
|---|---|---|
| `core/api.js` | вызовы сервера | нет |
| `*.actions.js` | бизнес-логика: читает и меняет `store`, вызывает `api` | нет |
| чистые модули (`il.js`, `dates.js`, `geo.js`, `colorScale.js`, `chart.configs.js`) | функции «данные → данные» | нет |
| `*.view.js` | рисует кусок интерфейса, подписывается на `store`, вызывает `actions` | да (DOM) |
| `map/MapController.js`, `map/layers/*`, `map/map-ui.js` | всё императивное управление Leaflet | да (Leaflet) |
| `interpolation/kriging.js` | единственный импорт библиотеки кригинга | библиотека кригинга |
| `chart/chart.view.js` | единственный импорт Chart.js | Chart.js |

Правила, которые держат структуру в порядке:

1. **`actions` не импортируют view и Leaflet.** Всё «внешнее» (алерт, скачивание файла, перезагрузка страницы, доступ к карте) приходит в экшен параметром: `notify`, `download`, `reload`, `mapPort`. Поэтому экшены тестируются в Node без браузера (`client/tests/actions.test.js`) и без изменений подключаются к React.
2. **`view` не ходит на сервер и не считает.** Он читает состояние, показывает его и в ответ на клики вызывает экшены.
3. **Состояние — только данные.** В `store` нет DOM-элементов и объектов Leaflet/Chart.js; состояние никогда не мутируется (каждое изменение создаёт новый объект).
4. **Константы — только в `core/config.js`.** Пороги, цвета шкал, часовой пояс, параметры кригинга не разбросаны по файлам.
5. **Фичи не лезут в чужие внутренности.** Общаются через `store` и экшены; общие вещи вынесены в `core/` и `features/il`, `features/interpolation`.

## Поток данных

```
клик пользователя
   │
   ▼
view (*.view.js) ── вызывает ──►  actions (*.actions.js) ── запрос ──► core/api.js ──► сервер
                                     │
                                     │ patchSlice(store, ...)
                                     ▼
                                   store  ── watch(...) ──► view перерисовывается
                                     │
                                     └── watch(...) ──► MapController.bindToStore ──► Leaflet
```

Пример: клик по маркеру → `MarkersLayer` вызывает `onObjectSelect` → `chart.actions.loadProfile(id)` → запрос `/api/object-details` → `store.chart.display` → `chart.view` перерисовывает график. Ни один из шагов не знает о соседях напрямую.

## Состояние (`core/initialState.js`)

```js
{
  auth:    { user },                       // { username, role } или null
  date:    { input },                      // значение поля datetime-local
  objects: { list },                       // ответ /api/objects
  chart:   { mode, selectedObjectId, selectedSensorId,
             profileRows, trend: { sensorId, rows },
             display: { view, title, rows, sensorId } },   // что нарисовано в графике
  layers:  { il, w }                       // включены ли слои кригинга / влажности
}
```

## Как это превратится в React

Слои «логика» переносятся без изменений, заменяются только view и «мост» к карте.

| Сейчас | В React |
|---|---|
| `core/store.js` | `zustand` (тот же API `getState` / `setState` / `subscribe`) или `useSyncExternalStore` поверх текущего store |
| `watch(store, [селектор], cb)` | `useStore(селектор)` / `useEffect(..., [значение])` |
| `features/*/*.actions.js` | без изменений: создаются один раз и раздаются через Context (`useActions()`) |
| `core/api.js` | без изменений; при желании обернуть в React Query (`useQuery`) — гонки запросов, кэш и «загрузка/ошибка» тогда решаются библиотекой, а `profileSeq` / `trendSeq` в `chart.actions.js` становятся не нужны |
| чистые модули (`il`, `dates`, `geo`, `colorScale`), `arrayToCSV`, `objectsToPoints` | без изменений |
| `chart.configs.js` | без изменений: `<Line data={cfg.data} options={cfg.options} />` (react-chartjs-2) |
| `*.view.js` | компоненты: `AuthBar`, `DateSelector`, `ChartControls`, `ChartPanel`, `MapToolbar`. Шаблон HTML в `innerHTML` → JSX, `watch` → хуки, `addEventListener` → `onClick` |
| `app/layout.js` | компонент `<AppLayout>` (слоты → `children`/пропсы) |
| `app/bootstrap.js` | `<App>` + провайдеры (store, actions, map) |
| `MapController` + `layers/*` | остаются императивными: `useRef` + `useEffect` в компоненте `<Map>` (либо `react-leaflet`, если захочется декларативности) |
| `MapController.bindToStore` | два `useEffect` внутри `<Map>` (маркеры ← `objects.list`, легенда ← `layers`) |

Рекомендуемый порядок миграции: (1) поставить React в `client/` рядом с Vite; (2) смонтировать `<App>` в `#root`, начиная с самого простого — `AuthBar`; (3) по одному переписывать view в компоненты, оставляя остальные на текущей реализации (они работают от того же `store`); (4) в конце заменить `bootstrap.js`. Каждый шаг оставляет приложение рабочим.

## Как добавить новое

- **Новая кнопка/панель:** view в `features/<фича>/`, вызывает существующий или новый экшен.
- **Новый запрос к серверу:** маршрут в `server/routes/index.js` → функция в контроллере → функция с SQL в сервисе → функция в `client/src/core/api.js` → экшен.
- **Разграничение по ролям:** пока все роли видят одно и то же. Когда понадобится — добавьте небольшую функцию `can(user, право)` (например, в `features/auth/`) и используйте её во view; роль пользователя уже лежит в `store.auth.user.role`, значения ролей — в `ROLES` (`core/config.js`).
- **Заменить/ускорить кригинг** (Web Worker, сервер): менять только `features/interpolation/kriging.js` и `layers/KrigingLayer.js`.
- **Изменить порог, цвет, центр карты:** `core/config.js` (и `IL_COLOR_STOPS` в `interpolation/colorScale.js`).

## Куда переехал код из старых файлов

**index.html**

| Было | Стало |
|---|---|
| разметка страницы | `app/layout.js` (каркас) + шаблоны в `*.view.js` |
| `openLoginModal`, `login`, `logout`, `applyRolePermissions`, автопроверка сессии | `features/auth/*`, `core/session.js` |
| `getSelectedDateParam`, поле даты, кнопка «Ок» | `features/date/*` |
| `loadSensorDataForObject`, `loadSensorTrend`, `populateDepthSelect`, режимы, `profileRequestSeq`/`trendRequestSeq` | `features/chart/chart.actions.js`, `chart.view.js` |
| `updateChart`, `updateTrendChart` | `features/chart/chart.configs.js` + `chart.view.js` |
| `arrayToCSV`, `downloadCSV`, кнопка «Экспорт CSV» | `features/export/export.actions.js`, `core/dom.js` |
| `projectLatLng`, `trainIlVariogram`, `kriging.predict` | `features/interpolation/geo.js`, `kriging.js` |
| `IL_COLOR_STOPS`, `ilValueToColor`, `ilColorStopsToCssGradient` | `features/interpolation/colorScale.js` |
| `drawIlSurface`, `activateIlLayer`, `moveend`/`click` на карте | `features/map/layers/KrigingLayer.js` |
| `createWLayer` | `features/map/layers/WLayer.js` |
| кнопки `toggleKriging` / `toggleWMap`, `refreshInterpolationLayers` | `features/map/map.actions.js`, `map-toolbar.view.js` |
| `updateLayerLegend`, легенда, шаблоны подсказок | `features/map/map-ui.js` (+ `MapController.bindToStore`) |
| `loadObjects`, маркеры, `markersByObjectId` | `features/objects/objects.actions.js`, `features/map/layers/MarkersLayer.js` |
| `goToObject`, поиск | `features/map/map.actions.js`, `MapController.focusObject`, `map-toolbar.view.js` |
| цвета статусов IL, разбросанные по коду | `features/il/il.js` |
| числа: центр карты, пороги, радиусы, масштаб растра | `core/config.js` |

**Остальные файлы репозитория**

| Было | Стало |
|---|---|
| `public/index.html` | `client/` (см. таблицу выше) |
| `sensors/*.csv` | `data/sensors/` |
| `sensor.html`, `data.json` | `legacy/` |
| `package-lock.json` | не переносится: создаётся заново командой `npm run install:all` (отдельно для корня и для `client/`) |

**server.js**

| Было | Стало |
|---|---|
| `Pool`, `SET TIME ZONE`, проверка подключения | `server/db/pool.js`, `server/config/env.js` |
| маршруты | `server/routes/index.js` (те же URL) |
| обработчики `(req, res)` | `server/controllers/*.js` |
| SQL-запросы | `server/services/*.js` |
| проверка полей телеметрии | `validateBatch` / `hasRequiredFields` в `server/services/telemetry.service.js` |
| `express.static('public')` | `server/app.js` → `client/dist` (собранный фронтенд) |

## Осознанные отличия от старой версии

Поведение сохранено, кроме нескольких мест, где старый код явно расходился с задуманным:

1. **Слои IL и W** по-прежнему могут быть включены одновременно (включение W выключает IL, но не наоборот) — как в старом коде. В `opisanie-sistemy.md` они названы «взаимоисключающими», это не совсем так.
2. **После «Ок» — один запрос `/api/objects`** вместо до трёх (маркеры, слой IL, слой W): результат используется всеми.
3. **Цвет кнопки «Average W»** теперь вычисляется из состояния. Раньше он мог остаться красным, если слой выключался из-за отсутствия данных.
4. **Точка графика с `il = null`** на профиле теперь серая (раньше зелёная: `null <= 0` истинно). На тренде было серым и раньше.
5. **Всплывающие подсказки** экранируют `object_id` (защита от HTML-инъекции через данные).
6. **Leaflet.heat и Leaflet.idw** не подключены: в коде они не использовались.
7. **Tailwind** подключается на этапе сборки (v3), а не через CDN-скрипт, который не предназначен для продакшена.
8. **Правило `canvas { height: 500px }`** сужено до холста графика (`.chart-canvas`).

## Что осталось «как есть» и на что обратить внимание позже

- `legacy/sensor.html` и `legacy/data.json` — ранний прототип (обращается к несуществующему `/api/sensors`, другая модель данных). Ничем не используется, лежит только для истории; можно удалить.
- `data/sensors/*.csv` — исходные показания (47 объектов, 2397 строк, один момент времени 2026-05-05 12:00, числа с запятой). Команда `npm run import` ожидает скрипт импорта в `scripts/import_csv_to_db.js`; в репозитории его не было — положите свой файл туда.
- Схема базы данных и таблица `objects` (координаты объектов) в репозиторий не входят — база ведётся отдельно.
- Пароли по-прежнему сравниваются в открытом виде, сессия — запись в `localStorage`. Место для исправления уже выделено: `server/services/auth.service.js` и `client/src/core/session.js`.
- Кригинг по-прежнему считается в главном потоке браузера (`KrigingLayer`) — следующий кандидат на вынос в Web Worker.
- `MapController.bindToStore` знает форму состояния (`objects.list`, `layers`). Это осознанная плата за меньшее число файлов; в React этот код всё равно превратится в эффекты компонента карты.
