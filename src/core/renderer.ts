import mapboxgl from 'mapbox-gl';
import type { S57Config, PerformanceStats } from '../types/config';
import type { S57Theme } from '../types/style';
import { StyleManager } from './style-manager';
import { LayerManager } from './layer-manager';
import { InteractionManager } from './interaction-manager';
import { PerformanceMonitor } from '../utils/performance';

/**
 * S57海图渲染引擎主类
 * 负责协调地图渲染、样式管理、图层管理和交互处理
 */
export class S57MapRenderer {
    private map!: mapboxgl.Map;
    private config: S57Config;
    private styleManager!: StyleManager;
    private layerManager!: LayerManager;
    private interactionManager!: InteractionManager;
    private performanceMonitor: PerformanceMonitor;
    private initialized = false;

    constructor(config: S57Config) {
        this.config = config;
        this.performanceMonitor = new PerformanceMonitor(config.performance.monitoring);
    }

    /**
     * 初始化渲染引擎
     */
    async initialize(): Promise<void> {
        try {
            this.performanceMonitor.startTimer('initialization');

            // 设置为离线模式，不需要Mapbox token
            (mapboxgl as any).accessToken = undefined;

            // 创建Mapbox地图实例
            this.map = new mapboxgl.Map({
                container: this.config.map.container,
                style: this.config.map.style || this.createBaseStyle(),
                center: this.config.map.center || [0, 0],
                zoom: this.config.map.zoom || 1,
                bearing: this.config.map.bearing || 0,
                pitch: this.config.map.pitch || 0,
                minZoom: this.config.map.minZoom || 0,
                maxZoom: this.config.map.maxZoom || 22,
                renderWorldCopies: this.config.map.renderWorldCopies ?? true,
                antialias: this.config.rendering.antialiasing,
                preserveDrawingBuffer: this.config.rendering.preserveDrawingBuffer,
                transformRequest: (url: string, resourceType: any) => {
                    // 拦截所有请求，只允许我们自己的数据源
                    if (url.startsWith('http://localhost') || url.startsWith('data:') || url.startsWith('blob:')) {
                        return { url };
                    }
                    // 阻止其他外部请求
                    return { url: '' };
                }
            });

            // 等待地图加载完成
            await new Promise<void>((resolve) => {
                this.map.on('load', () => resolve());
            });

            // 初始化管理器
            this.styleManager = new StyleManager(this.map, this.config);
            this.layerManager = new LayerManager(this.map, this.config);
            this.interactionManager = new InteractionManager(this.map, this.config);

            await Promise.all([
                this.styleManager.initialize(),
                this.layerManager.initialize(),
                this.interactionManager.initialize()
            ]);

            // 设置初始边界
            if (this.config.map.bounds) {
                this.map.fitBounds(this.config.map.bounds);
            }

            this.initialized = true;
            this.performanceMonitor.endTimer('initialization');

            // 启动性能监控
            if (this.config.performance.monitoring.performanceMetrics) {
                this.startPerformanceMonitoring();
            }

        } catch (error) {
            this.performanceMonitor.recordError('initialization', error as Error);
            throw new Error(`S57渲染引擎初始化失败: ${error}`);
        }
    }

    /**
     * 加载S57切片数据
     */
    async loadS57Tiles(sourceId: string, sourceUrl: string): Promise<void> {
        if (!this.initialized) {
            throw new Error('渲染引擎未初始化');
        }

        try {
            this.performanceMonitor.startTimer('loadTiles');

            // 添加数据源
            await this.layerManager.addS57Source(sourceId, sourceUrl);

            // 应用当前样式
            await this.styleManager.applyS57Styles(sourceId);

            this.performanceMonitor.endTimer('loadTiles');
        } catch (error) {
            this.performanceMonitor.recordError('loadTiles', error as Error);
            throw new Error(`加载S57切片失败: ${error}`);
        }
    }

    /**
     * 更新样式配置
     */
    async updateStyle(theme?: S57Theme): Promise<void> {
        if (!this.initialized) {
            throw new Error('渲染引擎未初始化');
        }

        try {
            this.performanceMonitor.startTimer('updateStyle');

            if (theme) {
                await this.styleManager.applyTheme(theme);
            } else {
                await this.styleManager.refreshStyles();
            }

            this.performanceMonitor.endTimer('updateStyle');
        } catch (error) {
            this.performanceMonitor.recordError('updateStyle', error as Error);
            throw error;
        }
    }

    /**
     * 设置视图区域
     */
    async setViewport(bounds: mapboxgl.LngLatBoundsLike, zoom?: number): Promise<void> {
        if (!this.initialized) {
            throw new Error('渲染引擎未初始化');
        }

        try {
            if (zoom !== undefined) {
                this.map.fitBounds(bounds, { zoom });
            } else {
                this.map.fitBounds(bounds);
            }
        } catch (error) {
            throw new Error(`设置视图区域失败: ${error}`);
        }
    }

    /**
     * 获取地图实例
     */
    getMap(): mapboxgl.Map {
        return this.map;
    }

    /**
     * 获取样式管理器
     */
    getStyleManager(): StyleManager {
        return this.styleManager;
    }

    /**
     * 获取图层管理器
     */
    getLayerManager(): LayerManager {
        return this.layerManager;
    }

    /**
     * 获取交互管理器
     */
    getInteractionManager(): InteractionManager {
        return this.interactionManager;
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats(): PerformanceStats {
        return this.performanceMonitor.getStats();
    }

    /**
     * 切换图层可见性
     */
    async toggleLayerVisibility(layerId: string, visible?: boolean): Promise<void> {
        if (!this.initialized) {
            throw new Error('渲染引擎未初始化');
        }

        await this.layerManager.setLayerVisibility(layerId, visible);
    }

    /**
     * 更新图层过滤器
     */
    async updateLayerFilter(layerId: string, filter: mapboxgl.Expression): Promise<void> {
        if (!this.initialized) {
            throw new Error('渲染引擎未初始化');
        }

        await this.layerManager.updateLayerFilter(layerId, filter);
    }

    /**
     * 清理资源
     */
    destroy(): void {
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }

        if (this.interactionManager) {
            this.interactionManager.destroy();
        }

        if (this.map) {
            this.map.remove();
        }

        this.initialized = false;
    }

    /**
     * 创建基础样式
     */
    private createBaseStyle(): mapboxgl.StyleSpecification {
        return {
            version: 8,
            name: 'S57 Base Style',
            sources: {},
            layers: [
                {
                    id: 'background',
                    type: 'background',
                    paint: {
                        'background-color': '#a5bfdb'
                    }
                }
            ]
        };
    }

    /**
     * 启动性能监控
     */
    private startPerformanceMonitoring(): void {
        // 监控FPS
        let lastTime = performance.now();
        let frameCount = 0;

        const updateFPS = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.performanceMonitor.updateFPS(fps);
                frameCount = 0;
                lastTime = currentTime;
            }

            if (this.config.performance.monitoring.performanceMetrics) {
                requestAnimationFrame(updateFPS);
            }
        };

        requestAnimationFrame(updateFPS);

        // 监控地图事件
        this.map.on('render', () => {
            this.performanceMonitor.recordRenderFrame();
        });

        this.map.on('sourcedata', (e) => {
            if (e.isSourceLoaded) {
                this.performanceMonitor.recordDataLoad(e.sourceId || 'unknown');
            }
        });

        // 定期清理内存统计
        setInterval(() => {
            this.performanceMonitor.updateMemoryStats();
        }, this.config.performance.memory.cleanupInterval);
    }
} 