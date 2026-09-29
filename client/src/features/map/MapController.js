import L from 'leaflet';
import { MAP_CONFIG } from '../../core/config.js';
import { watch } from '../../core/store.js';
import { MarkersLayer } from './layers/MarkersLayer.js';
import { KrigingLayer } from './layers/KrigingLayer.js';
import { WLayer } from './layers/WLayer.js';
import { createLegendControl } from './map-ui.js';

/**
 * Единственный владелец экземпляра Leaflet-карты и всех её слоёв.
 * Вся императивная работа с Leaflet живёт здесь и в map/layers/*.
 * Остальной код (экшены, view) карту напрямую не трогает — только через этот класс.
 *
 * Для React: создаётся один раз в useEffect (или в хуке useMap); метод bindToStore
 * превращается в два useEffect внутри компонента <Map>.
 */
export class MapController {
    constructor(container, { onObjectSelect }) {
        this.map = L.map(container).setView(MAP_CONFIG.center, MAP_CONFIG.zoom);

        L.tileLayer(MAP_CONFIG.tileUrl, { attribution: MAP_CONFIG.attribution }).addTo(this.map);

        this.legend = createLegendControl();
        this.legend.addTo(this.map);

        this.markers = new MarkersLayer(this.map, { onSelect: onObjectSelect });
        this.il = new KrigingLayer(this.map); // { enable(points), disable() }
        this.w = new WLayer(this.map); // { enable(points), disable() }

        this.unbind = () => {};
    }

    /**
     * Связывает состояние с картой: когда меняется список объектов — перерисовываются
     * маркеры, когда меняются включённые слои — обновляется легенда.
     */
    bindToStore(store) {
        const stops = [
            watch(store, [(s) => s.objects.list], (list) => this.markers.render(list)),
            watch(store, [(s) => s.layers.il, (s) => s.layers.w], (il, w) => this.legend.update({ il, w }))
        ];
        this.unbind = () => stops.forEach((off) => off());
    }

    /** Карта была скрыта (display:none) и получила размеры — Leaflet нужно об этом сообщить */
    invalidateSize() {
        this.map.invalidateSize();
    }

    /** Приблизить карту к объекту, открыть его подсказку и "кликнуть" по нему (подгрузит график) */
    focusObject(objectId) {
        const marker = this.markers.get(objectId);
        if (!marker) return false;

        this.map.setView(marker.getLatLng(), 16, { animate: true });
        marker.openPopup();
        marker.fire('click');
        return true;
    }

    destroy() {
        this.unbind();
        this.il.destroy();
        this.map.remove();
    }
}
