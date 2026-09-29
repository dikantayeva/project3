// Мелкие помощники для работы с DOM. Используются только во view-файлах.

export function qs(root, selector) {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Не найден элемент ${selector}`);
    return el;
}

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Скачивает строку как CSV-файл. ﻿ (BOM) нужен, чтобы Excel правильно читал кириллицу. */
export function downloadCsv(csvString, filename) {
    const blob = new Blob(['﻿' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
