import L from 'leaflet';
import { getIlClass } from '../../il/il.js';
import { objectPopupHtml } from '../map-ui.js';

/**
 * Круглые маркеры объектов. Цвет — по среднему IL на выбранный момент.
 * Не знает про состояние приложения: получает список объектов и коллбэк onSelect.
 * (В React это был бы компонент <ObjectMarkers objects onSelect />.)
 */
export class MarkersLayer {
    constructor(map, { onSelect }) {
        this.map = map;
        this.onSelect = onSelect;
        this.markersById = {}; // object_id -> маркер (нужен для поиска)
    }

    render(objects) {
        // Удаляем старые маркеры перед перерисовкой (иначе будут дублироваться)
        Object.values(this.markersById).forEach((marker) => this.map.removeLayer(marker));
        this.markersById = {};

        objects.forEach((obj) => {
            const cls = getIlClass(obj.avg_il);

            const marker = L.circleMarker([obj.lat, obj.lng], {
                radius: 10,
                fillColor: cls.markerColor,
                color: '#ffffff', // обводка
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);

            marker.bindPopup(objectPopupHtml(obj));

            marker.on('click', (e) => {
                // чтобы клик по маркеру не открывал ещё и прогноз кригинга
                L.DomEvent.stopPropagation(e);
                this.onSelect(obj.object_id);
            });

            this.markersById[obj.object_id] = marker;
        });
    }

    get(objectId) {
        return this.markersById[objectId] || null;
    }
}
