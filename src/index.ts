/**
 * Mapbox S-57 海图渲染系统
 * 主要导出接口
 */

// 核心渲染器
export { S57MapRenderer } from './core/renderer';
export { StyleManager } from './core/style-manager';
export { LayerManager } from './core/layer-manager';
export { InteractionManager, type InteractionEvent, type InteractionEventHandler } from './core/interaction-manager';

// 类型定义
export * from './types/s57';
export * from './types/style';
export * from './types/config';

// 样式配置
export { getDefaultColorPalette } from './styles/colors';
export { getDefaultSymbolSet } from './styles/symbols';
export { getDefaultStyleConfig } from './styles/base';

// 工具函数
export { PerformanceMonitor } from './utils/performance';

// 版本信息
export const VERSION = '1.0.0';

/**
 * 创建S57渲染器的便捷函数
 */
export async function createS57Renderer(container: string | HTMLElement, options?: Partial<import('./types/config').S57Config>) {
    const { S57MapRenderer } = await import('./core/renderer');
    const { getDefaultStyleConfig } = await import('./styles/base');

    const defaultConfig: import('./types/config').S57Config = {
        map: {
            container,
            center: [120.0, 30.0],
            zoom: 8,
            minZoom: 1,
            maxZoom: 18,
            ...options?.map
        },
        data: {
            s57Sources: [],
            staticTiles: false,
            cacheSize: 100,
            preloadZoomLevels: [6, 8, 10],
            ...options?.data
        },
        rendering: {
            theme: 'day',
            styleConfig: getDefaultStyleConfig(),
            lod: {
                levels: [
                    {
                        minZoom: 0,
                        maxZoom: 8,
                        simplificationTolerance: 0.001,
                        visibility: { points: true, lines: true, polygons: true, text: false }
                    },
                    {
                        minZoom: 8,
                        maxZoom: 12,
                        simplificationTolerance: 0.0005,
                        visibility: { points: true, lines: true, polygons: true, text: true }
                    },
                    {
                        minZoom: 12,
                        maxZoom: 22,
                        simplificationTolerance: 0.0001,
                        visibility: { points: true, lines: true, polygons: true, text: true }
                    }
                ],
                strategy: 'zoom'
            },
            symbols: {
                symbolSetUrl: '/symbols/s57-symbols.json',
                iconSize: 16,
                textSize: 12,
                collisionDetection: true,
                clustering: {
                    enabled: true,
                    radius: 50,
                    maxZoom: 14,
                    properties: {}
                }
            },
            antialiasing: true,
            highDPI: true,
            preserveDrawingBuffer: false,
            ...options?.rendering
        },
        performance: {
            optimization: {
                batchRendering: true,
                frustumCulling: true,
                levelOfDetail: true,
                geometrySimplification: true,
                textureCompression: true
            },
            memory: {
                tileCacheSize: 50,
                symbolCacheSize: 10,
                maxRetainedTiles: 200,
                cleanupInterval: 30000
            },
            network: {
                maxConcurrentRequests: 6,
                retryAttempts: 3,
                timeout: 10000,
                compression: 'gzip'
            },
            monitoring: {
                performanceMetrics: true,
                errorReporting: true,
                debugMode: false,
                logLevel: 'info'
            },
            ...options?.performance
        },
        localization: {
            defaultLanguage: 'zh-CN',
            supportedLanguages: ['zh-CN', 'en-US'],
            attributeMapping: {
                'zh-CN': {
                    'OBJNAM': '对象名称',
                    'INFORM': '信息',
                    'VALDCO': '水深值'
                },
                'en-US': {
                    'OBJNAM': 'Object Name',
                    'INFORM': 'Information',
                    'VALDCO': 'Depth Value'
                }
            },
            ...options?.localization
        }
    };

    const renderer = new S57MapRenderer(defaultConfig);
    await renderer.initialize();

    return renderer;
} 