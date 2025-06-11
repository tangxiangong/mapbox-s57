import mapboxgl from 'mapbox-gl';
import type { S57Config, S57SourceConfig } from '../types/config';
import type { S57LayerConfig, LayerVisibility } from '../types/style';

/**
 * 图层管理器
 * 负责管理S57海图的图层层次结构、可见性和数据源
 */
export class LayerManager {
    private map: mapboxgl.Map;
    private config: S57Config;
    private layerVisibility: LayerVisibility = {};
    private layerOrder: string[] = [];
    private sources: Map<string, S57SourceConfig> = new Map();

    constructor(map: mapboxgl.Map, config: S57Config) {
        this.map = map;
        this.config = config;
    }

    /**
     * 初始化图层管理器
     */
    async initialize(): Promise<void> {
        try {
            // 预加载配置的数据源
            for (const sourceConfig of this.config.data.s57Sources) {
                await this.addS57Source(sourceConfig.id, sourceConfig.url, sourceConfig);
            }
        } catch (error) {
            throw new Error(`图层管理器初始化失败: ${error}`);
        }
    }

    /**
     * 添加S57数据源
     */
    async addS57Source(sourceId: string, sourceUrl: string, config?: Partial<S57SourceConfig>): Promise<void> {
        try {
            const sourceConfig: S57SourceConfig = {
                id: sourceId,
                type: 'vector',
                url: sourceUrl,
                ...config
            };

            // 创建Mapbox数据源配置
            const mapboxSource: any = {
                type: 'vector',
                url: sourceUrl,
                attribution: sourceConfig.attribution,
                minzoom: sourceConfig.minzoom,
                maxzoom: sourceConfig.maxzoom,
                bounds: sourceConfig.bounds,
                scheme: sourceConfig.scheme,
                tiles: sourceConfig.type === 'vector' ? undefined : [sourceUrl]
            };

            // 如果是静态瓦片，使用tiles属性
            if (this.config.data.staticTiles && !sourceUrl.includes('.json')) {
                delete mapboxSource.url;
                mapboxSource.tiles = [sourceUrl];
            }

            // 添加数据源到地图
            if (!this.map.getSource(sourceId)) {
                this.map.addSource(sourceId, mapboxSource);
            }

            // 保存源配置
            this.sources.set(sourceId, sourceConfig);

        } catch (error) {
            throw new Error(`添加S57数据源失败: ${error}`);
        }
    }

    /**
     * 移除数据源
     */
    removeSource(sourceId: string): void {
        try {
            // 移除相关图层
            const layersToRemove = this.layerOrder.filter(layerId => layerId.startsWith(sourceId));
            for (const layerId of layersToRemove) {
                this.removeLayer(layerId);
            }

            // 移除数据源
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }

            this.sources.delete(sourceId);
        } catch (error) {
            console.warn(`移除数据源失败: ${error}`);
        }
    }

    /**
     * 添加图层
     */
    async addLayer(layerConfig: S57LayerConfig, beforeId?: string): Promise<void> {
        try {
            if (!this.map.getLayer(layerConfig.id)) {
                this.map.addLayer(layerConfig as any, beforeId);

                // 更新图层顺序
                if (beforeId) {
                    const beforeIndex = this.layerOrder.indexOf(beforeId);
                    if (beforeIndex !== -1) {
                        this.layerOrder.splice(beforeIndex, 0, layerConfig.id);
                    } else {
                        this.layerOrder.push(layerConfig.id);
                    }
                } else {
                    this.layerOrder.push(layerConfig.id);
                }

                // 设置初始可见性
                this.layerVisibility[layerConfig.id] = true;
            }
        } catch (error) {
            throw new Error(`添加图层失败: ${error}`);
        }
    }

    /**
     * 移除图层
     */
    removeLayer(layerId: string): void {
        try {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }

            // 更新图层顺序和可见性记录
            const index = this.layerOrder.indexOf(layerId);
            if (index !== -1) {
                this.layerOrder.splice(index, 1);
            }
            delete this.layerVisibility[layerId];
        } catch (error) {
            console.warn(`移除图层失败: ${error}`);
        }
    }

    /**
     * 重新排序图层
     */
    async reorderLayers(layerOrder: string[]): Promise<void> {
        try {
            // 验证所有图层都存在
            for (const layerId of layerOrder) {
                if (!this.map.getLayer(layerId)) {
                    throw new Error(`图层 ${layerId} 不存在`);
                }
            }

            // 从下到上重新排序
            for (let i = layerOrder.length - 1; i >= 0; i--) {
                const layerId = layerOrder[i];
                const nextLayerId = i < layerOrder.length - 1 ? layerOrder[i + 1] : undefined;

                // 移动图层到指定位置
                this.map.moveLayer(layerId, nextLayerId);
            }

            this.layerOrder = [...layerOrder];
        } catch (error) {
            throw new Error(`图层重排失败: ${error}`);
        }
    }

    /**
     * 设置图层可见性
     */
    async setLayerVisibility(layerId: string, visible?: boolean): Promise<void> {
        try {
            const layer = this.map.getLayer(layerId);
            if (!layer) {
                throw new Error(`图层 ${layerId} 不存在`);
            }

            const newVisibility = visible !== undefined ? visible : !this.layerVisibility[layerId];

            this.map.setLayoutProperty(layerId, 'visibility', newVisibility ? 'visible' : 'none');
            this.layerVisibility[layerId] = newVisibility;
        } catch (error) {
            throw new Error(`设置图层可见性失败: ${error}`);
        }
    }

    /**
     * 批量设置图层可见性
     */
    async setLayersVisibility(layerVisibility: LayerVisibility): Promise<void> {
        try {
            for (const [layerId, visible] of Object.entries(layerVisibility)) {
                await this.setLayerVisibility(layerId, visible);
            }
        } catch (error) {
            throw new Error(`批量设置图层可见性失败: ${error}`);
        }
    }

    /**
     * 更新图层过滤器
     */
    async updateLayerFilter(layerId: string, filter: mapboxgl.Expression): Promise<void> {
        try {
            const layer = this.map.getLayer(layerId);
            if (!layer) {
                throw new Error(`图层 ${layerId} 不存在`);
            }

            this.map.setFilter(layerId, filter);
        } catch (error) {
            throw new Error(`更新图层过滤器失败: ${error}`);
        }
    }

    /**
     * 更新图层样式属性
     */
    updateLayerPaint(layerId: string, property: string, value: any): void {
        try {
            const layer = this.map.getLayer(layerId);
            if (!layer) {
                throw new Error(`图层 ${layerId} 不存在`);
            }

            this.map.setPaintProperty(layerId, property as any, value);
        } catch (error) {
            console.warn(`更新图层样式失败: ${error}`);
        }
    }

    /**
     * 更新图层布局属性
     */
    updateLayerLayout(layerId: string, property: string, value: any): void {
        try {
            const layer = this.map.getLayer(layerId);
            if (!layer) {
                throw new Error(`图层 ${layerId} 不存在`);
            }

            this.map.setLayoutProperty(layerId, property as any, value);
        } catch (error) {
            console.warn(`更新图层布局失败: ${error}`);
        }
    }

    /**
     * 获取图层可见性状态
     */
    getLayerVisibility(layerId: string): boolean {
        return this.layerVisibility[layerId] || false;
    }

    /**
     * 获取所有图层可见性状态
     */
    getAllLayersVisibility(): LayerVisibility {
        return { ...this.layerVisibility };
    }

    /**
     * 获取图层顺序
     */
    getLayerOrder(): string[] {
        return [...this.layerOrder];
    }

    /**
     * 获取所有数据源
     */
    getSources(): Map<string, S57SourceConfig> {
        return new Map(this.sources);
    }

    /**
     * 按类型获取图层
     */
    getLayersByType(layerType: string): mapboxgl.Layer[] {
        const layers: mapboxgl.Layer[] = [];

        for (const layerId of this.layerOrder) {
            const layer = this.map.getLayer(layerId);
            if (layer && layer.type === layerType) {
                layers.push(layer as any);
            }
        }

        return layers;
    }

    /**
     * 按数据源获取图层
     */
    getLayersBySource(sourceId: string): mapboxgl.Layer[] {
        const layers: mapboxgl.Layer[] = [];

        for (const layerId of this.layerOrder) {
            const layer = this.map.getLayer(layerId);
            if (layer && 'source' in layer && layer.source === sourceId) {
                layers.push(layer as any);
            }
        }

        return layers;
    }

    /**
     * 预加载指定区域的数据
     */
    async preloadArea(bounds: mapboxgl.LngLatBoundsLike, zoomLevels: number[]): Promise<void> {
        try {
            const currentZoom = this.map.getZoom();
            const currentCenter = this.map.getCenter();

            for (const zoom of zoomLevels) {
                // 临时设置zoom以触发数据加载
                this.map.setZoom(zoom);
                this.map.fitBounds(bounds);

                // 等待数据加载
                await new Promise<void>((resolve) => {
                    const checkLoaded = () => {
                        if (this.map.loaded()) {
                            resolve();
                        } else {
                            setTimeout(checkLoaded, 100);
                        }
                    };
                    checkLoaded();
                });
            }

            // 恢复原始视图
            this.map.setZoom(currentZoom);
            this.map.setCenter(currentCenter);
        } catch (error) {
            console.warn(`预加载区域数据失败: ${error}`);
        }
    }

    /**
     * 清理未使用的图层和数据源
     */
    cleanup(): void {
        try {
            // 移除所有图层
            for (const layerId of [...this.layerOrder]) {
                this.removeLayer(layerId);
            }

            // 清理数据源
            for (const sourceId of this.sources.keys()) {
                this.removeSource(sourceId);
            }

            // 重置状态
            this.layerVisibility = {};
            this.layerOrder = [];
            this.sources.clear();
        } catch (error) {
            console.warn(`清理图层管理器失败: ${error}`);
        }
    }
} 