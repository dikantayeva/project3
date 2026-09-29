/** @type {import('tailwindcss').Config} */
export default {
    // Классы Tailwind написаны в index.html и в шаблонах внутри src/**/*.js —
    // сканируем и то и другое. Динамически собирать имена классов из кусочков нельзя
    // (писать всегда целую строку, например 'bg-blue-600').
    content: ['./index.html', './src/**/*.js'],
    theme: { extend: {} },
    plugins: []
};
