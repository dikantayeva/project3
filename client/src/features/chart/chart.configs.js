import { getIlClass } from '../il/il.js';
import { formatTrendLabel } from '../date/dates.js';

// Чистые функции: данные -> конфигурация Chart.js. Библиотека здесь НЕ импортируется,
// поэтому конфиги тестируются в Node, а в React передаются как есть:
//   <Line data={cfg.data} options={cfg.options} />   (react-chartjs-2)

/** "Профиль по глубине": ось X — IL, ось Y — глубина (м) */
export function buildProfileChartConfig(rows) {
    const points = rows.map((item) => ({ x: item.il_value, y: item.depth_m }));

    return {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Индекс влажности (IL)',
                    data: points,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderWidth: 2,
                    tension: 0.1, // сглаживание линии
                    showLine: true,
                    // Цвет точки и её обводки — по зоне IL
                    pointBackgroundColor: rows.map((item) => getIlClass(item.il_value).markerColor),
                    pointBorderColor: rows.map((item) => getIlClass(item.il_value).borderColor),
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: -1,
                    max: 2,
                    title: { display: true, text: 'Liquidity Index (IL)' },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    type: 'linear',
                    min: -25,
                    max: 0,
                    title: { display: true, text: 'Глубина (м)' },
                    grid: { color: '#e2e8f0' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `IL: ${context.parsed.x.toFixed(4)}, Глубина: ${context.parsed.y}м`
                    }
                }
            }
        }
    };
}

/** "Тренд по времени": ось X — время измерения, ось Y — IL */
export function buildTrendChartConfig(rows) {
    const values = rows.map((item) => item.il_value);

    return {
        type: 'line',
        data: {
            labels: rows.map((item) => formatTrendLabel(item.timestamp)),
            datasets: [
                {
                    label: 'Индекс влажности (IL) во времени',
                    data: values,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: values.map((il) => getIlClass(il).markerColor)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Время измерения' },
                    ticks: { maxRotation: 45, minRotation: 45 }
                },
                y: {
                    title: { display: true, text: 'Liquidity Index (IL)' },
                    grid: { color: '#e2e8f0' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `IL: ${context.parsed.y !== null ? context.parsed.y.toFixed(4) : 'нет данных'}`
                    }
                }
            }
        }
    };
}

/** Что рисовать для текущего состояния графика (null — ничего) */
export function buildChartConfig(display) {
    if (display.view === 'profile') return buildProfileChartConfig(display.rows);
    if (display.view === 'trend') return buildTrendChartConfig(display.rows);
    return null;
}
