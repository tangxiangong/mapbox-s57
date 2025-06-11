import mapboxgl from 'mapbox-gl';
import type { S57Config } from '../types/config';
import type { S57Feature } from '../types/s57';

/**
 * 交互事件类型
 */
export interface InteractionEvent {
    type: 'click' | 'hover' | 'select' | 'deselect';
    features: S57Feature[];
    lngLat: mapboxgl.LngLat;
    point: mapboxgl.Point;
    originalEvent: Event;
}

/**
 * 交互事件处理器
 */
export type InteractionEventHandler = (event: InteractionEvent) => void;

/**
 * 交互管理器
 * 负责处理地图交互事件、要素选择和信息展示
 */
export class InteractionManager {
    private map: mapboxgl.Map;
    private config: S57Config;
    private eventHandlers: Map<string, InteractionEventHandler[]> = new Map();
    private selectedFeatures: S57Feature[] = [];
    private hoveredFeature: S57Feature | null = null;
    private popup: mapboxgl.Popup | null = null;
    private isInitialized = false;

    constructor(map: mapboxgl.Map, config: S57Config) {
        this.map = map;
        this.config = config;
    }

    /**
     * 初始化交互管理器
     */
    async initialize(): Promise<void> {
        try {
            this.setupEventListeners();
            this.setupCursor();
            this.isInitialized = true;
        } catch (error) {
            throw new Error(`交互管理器初始化失败: ${error}`);
        }
    }

    /**
     * 添加事件监听器
     */
    addEventListener(eventType: string, handler: InteractionEventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)?.push(handler);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(eventType: string, handler: InteractionEventHandler): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * 获取指定位置的要素
     */
    getFeaturesAtPoint(point: mapboxgl.Point, layerIds?: string[]): mapboxgl.MapboxGeoJSONFeature[] {
        const options: { layers?: string[] } = {};
        if (layerIds) {
            options.layers = layerIds;
        }
        return this.map.queryRenderedFeatures(point, options);
    }

    /**
     * 获取指定区域内的要素
     */
    getFeaturesInBounds(bounds: [mapboxgl.Point, mapboxgl.Point], layerIds?: string[]): mapboxgl.MapboxGeoJSONFeature[] {
        const options: { layers?: string[] } = {};
        if (layerIds) {
            options.layers = layerIds;
        }
        return this.map.queryRenderedFeatures(bounds, options);
    }

    /**
     * 选择要素
     */
    selectFeatures(features: S57Feature[]): void {
        // 清除之前的选择
        this.clearSelection();

        this.selectedFeatures = [...features];
        this.highlightFeatures(features, 'selected');

        // 触发选择事件
        this.emitEvent('select', {
            type: 'select',
            features,
            lngLat: new mapboxgl.LngLat(0, 0), // 占位符
            point: new mapboxgl.Point(0, 0), // 占位符
            originalEvent: new Event('select')
        });
    }

    /**
     * 清除选择
     */
    clearSelection(): void {
        if (this.selectedFeatures.length > 0) {
            this.removeHighlight(this.selectedFeatures, 'selected');

            const previousFeatures = [...this.selectedFeatures];
            this.selectedFeatures = [];

            // 触发取消选择事件
            this.emitEvent('deselect', {
                type: 'deselect',
                features: previousFeatures,
                lngLat: new mapboxgl.LngLat(0, 0),
                point: new mapboxgl.Point(0, 0),
                originalEvent: new Event('deselect')
            });
        }
    }

    /**
     * 高亮要素
     */
    private highlightFeatures(features: S57Feature[], type: 'selected' | 'hovered'): void {
        // 这里可以实现要素高亮逻辑
        // 例如修改要素的样式或添加高亮图层
        features.forEach(feature => {
            // 实现具体的高亮逻辑
            this.addFeatureHighlight(feature, type);
        });
    }

    /**
     * 移除高亮
     */
    private removeHighlight(features: S57Feature[], type: 'selected' | 'hovered'): void {
        features.forEach(feature => {
            this.removeFeatureHighlight(feature, type);
        });
    }

    /**
     * 添加要素高亮
     */
    private addFeatureHighlight(feature: S57Feature, type: 'selected' | 'hovered'): void {
        const highlightLayerId = `highlight-${type}-${feature.id}`;

        if (!this.map.getLayer(highlightLayerId)) {
            // 根据几何类型创建高亮图层
            if (feature.geometry.type === 'Point') {
                this.map.addLayer({
                    id: highlightLayerId,
                    type: 'circle',
                    source: {
                        type: 'geojson',
                        data: feature.geometry
                    },
                    paint: {
                        'circle-color': type === 'selected' ? '#ff0000' : '#ffff00',
                        'circle-radius': 8,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2
                    }
                });
            } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                this.map.addLayer({
                    id: highlightLayerId,
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: feature.geometry
                    },
                    paint: {
                        'line-color': type === 'selected' ? '#ff0000' : '#ffff00',
                        'line-width': 4,
                        'line-opacity': 0.8
                    }
                });
            } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                this.map.addLayer({
                    id: highlightLayerId,
                    type: 'fill',
                    source: {
                        type: 'geojson',
                        data: feature.geometry
                    },
                    paint: {
                        'fill-color': type === 'selected' ? '#ff0000' : '#ffff00',
                        'fill-opacity': 0.3,
                        'fill-outline-color': type === 'selected' ? '#ff0000' : '#ffff00'
                    }
                });
            }
        }
    }

    /**
     * 移除要素高亮
     */
    private removeFeatureHighlight(feature: S57Feature, type: 'selected' | 'hovered'): void {
        const highlightLayerId = `highlight-${type}-${feature.id}`;

        if (this.map.getLayer(highlightLayerId)) {
            this.map.removeLayer(highlightLayerId);
        }

        if (this.map.getSource(highlightLayerId)) {
            this.map.removeSource(highlightLayerId);
        }
    }

    /**
     * 显示要素信息弹窗
     */
    showFeaturePopup(feature: S57Feature, lngLat: mapboxgl.LngLat): void {
        this.hidePopup();

        const content = this.generatePopupContent(feature);

        this.popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px'
        })
            .setLngLat(lngLat)
            .setHTML(content)
            .addTo(this.map);
    }

    /**
     * 隐藏弹窗
     */
    hidePopup(): void {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }

    /**
     * 生成弹窗内容
     */
    private generatePopupContent(feature: S57Feature): string {
        const attrs = feature.attributes;
        let content = `<div class="s57-popup">`;

        // 标题
        content += `<h3>${feature.objectType}</h3>`;

        // 对象名称
        if (attrs.OBJNAM) {
            content += `<p><strong>名称:</strong> ${attrs.OBJNAM}</p>`;
        }

        // 深度信息
        if (attrs.VALDCO !== undefined) {
            content += `<p><strong>水深:</strong> ${attrs.VALDCO}m</p>`;
        }

        if (attrs.DRVAL1 !== undefined) {
            content += `<p><strong>深度范围:</strong> ${attrs.DRVAL1}`;
            if (attrs.DRVAL2 !== undefined) {
                content += ` - ${attrs.DRVAL2}`;
            }
            content += `m</p>`;
        }

        // 高度信息
        if (attrs.HEIGHT !== undefined) {
            content += `<p><strong>高度:</strong> ${attrs.HEIGHT}m</p>`;
        }

        // 状态信息
        if (attrs.STATUS !== undefined) {
            content += `<p><strong>状态:</strong> ${this.getStatusText(attrs.STATUS)}</p>`;
        }

        // 信息说明
        if (attrs.INFORM) {
            content += `<p><strong>信息:</strong> ${attrs.INFORM}</p>`;
        }

        content += `</div>`;
        return content;
    }

    /**
     * 获取状态文本
     */
    private getStatusText(status: number): string {
        const statusMap: Record<number, string> = {
            1: '永久',
            2: '临时',
            3: '建议',
            4: '公共',
            5: '私人',
            6: '强制',
            7: '禁止',
            8: '限制'
        };
        return statusMap[status] || `未知(${status})`;
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 点击事件
        this.map.on('click', (e) => {
            const features = this.getFeaturesAtPoint(e.point);
            if (features.length > 0) {
                const s57Features = this.convertToS57Features(features);

                this.emitEvent('click', {
                    type: 'click',
                    features: s57Features,
                    lngLat: e.lngLat,
                    point: e.point,
                    originalEvent: e.originalEvent
                });

                // 显示弹窗
                if (s57Features.length > 0) {
                    this.showFeaturePopup(s57Features[0], e.lngLat);
                }
            }
        });

        // 鼠标移动事件
        this.map.on('mousemove', (e) => {
            const features = this.getFeaturesAtPoint(e.point);

            if (features.length > 0) {
                const s57Feature = this.convertToS57Features(features)[0];

                if (!this.hoveredFeature || this.hoveredFeature.id !== s57Feature.id) {
                    // 清除之前的悬停状态
                    if (this.hoveredFeature) {
                        this.removeHighlight([this.hoveredFeature], 'hovered');
                    }

                    // 设置新的悬停状态
                    this.hoveredFeature = s57Feature;
                    this.highlightFeatures([s57Feature], 'hovered');

                    this.emitEvent('hover', {
                        type: 'hover',
                        features: [s57Feature],
                        lngLat: e.lngLat,
                        point: e.point,
                        originalEvent: e.originalEvent
                    });
                }
            } else {
                // 清除悬停状态
                if (this.hoveredFeature) {
                    this.removeHighlight([this.hoveredFeature], 'hovered');
                    this.hoveredFeature = null;
                }
            }
        });

        // 鼠标离开事件
        this.map.on('mouseleave', () => {
            if (this.hoveredFeature) {
                this.removeHighlight([this.hoveredFeature], 'hovered');
                this.hoveredFeature = null;
            }
        });
    }

    /**
     * 设置鼠标样式
     */
    private setupCursor(): void {
        // 设置可交互图层的鼠标样式
        this.map.on('mouseenter', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    /**
     * 转换为S57要素
     */
    private convertToS57Features(features: mapboxgl.MapboxGeoJSONFeature[]): S57Feature[] {
        return features.map(feature => ({
            id: feature.id?.toString() || `${Date.now()}-${Math.random()}`,
            objectType: feature.properties?.OBJL || 'UNKNOWN',
            geometryType: this.mapGeometryType(feature.geometry.type),
            geometry: feature.geometry,
            attributes: feature.properties || {},
            metadata: {
                recordId: 0,
                recordVersion: 1,
                updateInstruction: 'INSERT',
                sourceFile: '',
                compilationScale: 0,
                dataSetIdentificationNumber: '',
                editionNumber: 1,
                updateNumber: 0,
                issueDate: new Date().toISOString(),
                agencyCode: 0
            }
        }));
    }

    /**
     * 映射几何类型
     */
    private mapGeometryType(geoJSONType: string): 'Point' | 'Line' | 'Area' {
        switch (geoJSONType) {
            case 'Point':
            case 'MultiPoint':
                return 'Point';
            case 'LineString':
            case 'MultiLineString':
                return 'Line';
            case 'Polygon':
            case 'MultiPolygon':
                return 'Area';
            default:
                return 'Point';
        }
    }

    /**
     * 触发事件
     */
    private emitEvent(eventType: string, event: InteractionEvent): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`交互事件处理器错误: ${error}`);
                }
            });
        }
    }

    /**
     * 获取选中的要素
     */
    getSelectedFeatures(): S57Feature[] {
        return [...this.selectedFeatures];
    }

    /**
     * 获取悬停的要素
     */
    getHoveredFeature(): S57Feature | null {
        return this.hoveredFeature;
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.clearSelection();
        this.hidePopup();

        if (this.hoveredFeature) {
            this.removeHighlight([this.hoveredFeature], 'hovered');
        }

        this.eventHandlers.clear();
        this.isInitialized = false;
    }
} 