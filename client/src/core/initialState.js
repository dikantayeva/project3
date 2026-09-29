import { DEFAULT_DATE_INPUT } from './config.js';

/**
 * Единственный источник правды о состоянии интерфейса.
 * Тут нет ни DOM-элементов, ни экземпляров Leaflet / Chart.js — только данные.
 * Поэтому этот же объект без изменений станет состоянием в React.
 */
export function createInitialState() {
    return {
        auth: {
            user: null // { username, role }
        },

        date: {
            // Значение поля datetime-local "как есть": '2026-05-05T12:00'
            input: DEFAULT_DATE_INPUT
        },

        objects: {
            list: [] // ответ GET /api/objects
        },

        chart: {
            mode: 'profile', // 'profile' | 'trend'
            selectedObjectId: null,
            selectedSensorId: null, // значение выпадающего списка глубин
            profileRows: [], // показания объекта на выбранный момент (отсортированы по глубине)
            trend: { sensorId: null, rows: [] }, // последняя загруженная история датчика

            // Что сейчас нарисовано в графике
            display: {
                view: 'none', // 'none' | 'profile' | 'trend'
                title: 'Объект не выбран',
                rows: [],
                sensorId: null
            }
        },

        // Какие растровые слои включены (могут быть включены оба — как в исходной версии)
        layers: {
            il: false,
            w: false
        }
    };
}
