import mapboxgl from 'mapbox-gl';
import type { S57StyleConfig, S57Theme, LODConfig, LocalizationConfig } from './style';
import type { ValidationRule } from './s57';

// 主配置接口
export interface S57Config {
    map: MapConfig;
    data: DataConfig;
    rendering: RenderingConfig;
    performance: PerformanceConfig;
    localization: LocalizationConfig;
    development?: DevelopmentConfig;
}

// 地图配置
export interface MapConfig {
    container: string | HTMLElement;
    style?: string | mapboxgl.StyleSpecification;
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    bounds?: [[number, number], [number, number]];
    minZoom?: number;
    maxZoom?: number;
    renderWorldCopies?: boolean;
    projection?: string;
    transformRequest?: (url: string, resourceType: string) => { url: string };
}

// 数据配置
export interface DataConfig {
    s57Sources: S57SourceConfig[];
    tileserverUrl?: string;
    staticTiles?: boolean;
    cacheSize?: number;
    preloadZoomLevels?: number[];
}

export interface S57SourceConfig {
    id: string;
    type: 'mbtiles' | 'pmtiles' | 'vector' | 'geojson';
    url: string;
    attribution?: string;
    minzoom?: number;
    maxzoom?: number;
    bounds?: [number, number, number, number];
    scheme?: 'xyz' | 'tms';
    tileSize?: number;
}

// 渲染配置
export interface RenderingConfig {
    theme: S57Theme;
    styleConfig: S57StyleConfig;
    lod: LODConfig;
    symbols: SymbolRenderingConfig;
    antialiasing: boolean;
    highDPI: boolean;
    preserveDrawingBuffer: boolean;
}

export interface SymbolRenderingConfig {
    symbolSetUrl: string;
    iconSize: number;
    textSize: number;
    collisionDetection: boolean;
    clustering: ClusteringConfig;
}

export interface ClusteringConfig {
    enabled: boolean;
    radius: number;
    maxZoom: number;
    properties: Record<string, any>;
}

// 性能配置
export interface PerformanceConfig {
    optimization: OptimizationConfig;
    memory: MemoryConfig;
    network: NetworkConfig;
    monitoring: MonitoringConfig;
}

export interface OptimizationConfig {
    batchRendering: boolean;
    frustumCulling: boolean;
    levelOfDetail: boolean;
    geometrySimplification: boolean;
    textureCompression: boolean;
}

export interface MemoryConfig {
    tileCacheSize: number; // MB
    symbolCacheSize: number; // MB
    maxRetainedTiles: number;
    cleanupInterval: number; // ms
}

export interface NetworkConfig {
    maxConcurrentRequests: number;
    retryAttempts: number;
    timeout: number; // ms
    compression: 'gzip' | 'brotli' | 'none';
}

export interface MonitoringConfig {
    performanceMetrics: boolean;
    errorReporting: boolean;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// 开发配置
export interface DevelopmentConfig {
    hotReload: boolean;
    debugMode: boolean;
    performanceMonitoring: boolean;
    dataMocking: boolean;
    showFPS: boolean;
    showTileBoundaries: boolean;
    showCollisionBoxes: boolean;
}

// S-57 处理配置
export interface S57ProcessingConfig {
    inputDir: string;
    outputDir: string;
    validationRules: ValidationRule[];
    spatialReference: string;
    coordinatePrecision: number;
    attributeFilters: AttributeFilter[];
}

export interface AttributeFilter {
    objectType?: string;
    attributes: string[];
    action: 'include' | 'exclude';
}

// 几何优化配置
export interface GeometryOptimization {
    simplificationTolerance: number;
    coordinatePrecision: number;
    removeEmptyGeometries: boolean;
    validateTopology: boolean;
    bufferSize?: number;
}

// 切片生成配置
export interface TileGenerationConfig {
    minZoom: number;
    maxZoom: number;
    bufferSize: number;
    compression: 'gzip' | 'brotli' | 'none';
    layerConfig: LayerConfig[];
    tileSize: 256 | 512;
    scheme: 'xyz' | 'tms';
    format: 'pbf' | 'mvt';
}

export interface LayerConfig {
    id: string;
    source: string;
    minzoom?: number;
    maxzoom?: number;
    filter?: string;
    simplification?: number;
}

// 切片优化配置
export interface TileOptimization {
    tileSize: 512 | 256;
    dropDensestAsNeeded: boolean;
    bufferSize: number;
    compression: 'gzip' | 'brotli' | 'none';
    quantization?: number;
    delta?: boolean;
}

// 渲染优化配置
export interface RenderOptimization {
    preserveDrawingBuffer: boolean;
    antialias: boolean;
    batchSize: number;
    levelOfDetail: LODConfig;
    frustumCulling: boolean;
    occlusionCulling: boolean;
}

// 内存统计
export interface MemoryStats {
    totalMemory: number;
    usedMemory: number;
    tileCache: number;
    symbolCache: number;
    textureCache: number;
    bufferMemory: number;
}

// 性能统计
export interface PerformanceStats {
    fps: number;
    frameTime: number;
    renderTime: number;
    updateTime: number;
    networkRequests: number;
    activeConnections: number;
    memoryUsage: MemoryStats;
}

// 优化结果
export interface OptimizationResult {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    processingTime: number;
    warnings: string[];
    errors: string[];
}

// 拓扑结果
export interface TopologyResult {
    valid: boolean;
    errors: TopologyError[];
    warnings: TopologyWarning[];
}

export interface TopologyError {
    type: 'self-intersection' | 'invalid-ring' | 'duplicate-points' | 'unclosed-ring';
    message: string;
    coordinates?: [number, number];
    featureId?: string;
}

export interface TopologyWarning {
    type: 'small-polygon' | 'thin-polygon' | 'spike';
    message: string;
    coordinates?: [number, number];
    featureId?: string;
} 