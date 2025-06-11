import mapboxgl from 'mapbox-gl';

// S-57 颜色调色板
export interface S57ColorPalette {
    // 水深颜色渐变
    depths: {
        shallow: string;
        medium: string;
        deep: string;
        veryDeep: string;
    };
    // 导航要素
    navigation: {
        safeWater: string;
        caution: string;
        danger: string;
        prohibited: string;
    };
    // 地形要素
    topography: {
        land: string;
        rock: string;
        sand: string;
        mud: string;
    };
    // 文字颜色
    text: {
        primary: string;
        secondary: string;
        depth: string;
        warning: string;
    };
}

// S-57 样式配置
export interface S57StyleConfig {
    water: WaterStyle;
    land: LandStyle;
    depths: DepthStyle;
    navigation: NavigationStyle;
    hazards: HazardStyle;
    lighting: LightingStyle;
    symbols: SymbolStyle;
    text: TextStyle;
}

// 水域样式
export interface WaterStyle {
    backgroundColor: string;
    opacity: number;
    pattern?: string;
}

// 陆地样式
export interface LandStyle {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
}

// 水深样式
export interface DepthStyle {
    contourLines: {
        color: string;
        width: number;
        dashArray?: number[];
    };
    areas: {
        colorStops: Array<[number, string]>; // [depth, color]
        opacity: number;
    };
    soundings: {
        textColor: string;
        textSize: number;
        textFont: string[];
        haloColor: string;
        haloWidth: number;
    };
}

// 导航样式
export interface NavigationStyle {
    channels: {
        color: string;
        width: number;
        dashArray?: number[];
    };
    anchorages: {
        fillColor: string;
        strokeColor: string;
        strokeWidth: number;
        opacity: number;
    };
    restrictedAreas: {
        fillColor: string;
        strokeColor: string;
        strokeWidth: number;
        opacity: number;
        pattern?: string;
    };
}

// 危险物样式
export interface HazardStyle {
    wrecks: {
        symbolId: string;
        size: number;
        color: string;
    };
    rocks: {
        symbolId: string;
        size: number;
        color: string;
    };
    obstructions: {
        symbolId: string;
        size: number;
        color: string;
    };
}

// 灯光样式
export interface LightingStyle {
    lights: {
        symbolId: string;
        size: number;
        color: string;
        sectors?: {
            fillColor: string;
            strokeColor: string;
            opacity: number;
        };
    };
    beacons: {
        symbolId: string;
        size: number;
        color: string;
    };
    buoys: {
        symbolId: string;
        size: number;
        colorMap: Record<number, string>; // 颜色代码映射
    };
}

// 符号样式
export interface SymbolStyle {
    iconSize: number;
    iconOpacity: number;
    iconAnchor: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    iconRotationAlignment: 'map' | 'viewport' | 'auto';
    symbolPlacement: 'point' | 'line' | 'line-center';
    symbolSpacing?: number;
    iconAllowOverlap?: boolean;
    iconIgnorePlacement?: boolean;
}

// 文字样式
export interface TextStyle {
    fontFamily: string[];
    fontSize: {
        min: number;
        max: number;
        step: number;
    };
    color: string;
    haloColor: string;
    haloWidth: number;
    collision: 'auto' | 'cooperative' | 'none';
    placement: 'point' | 'line' | 'line-center';
    anchor: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offset?: [number, number];
    maxWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
    transform?: 'none' | 'uppercase' | 'lowercase';
}

// 主题类型
export type S57Theme = 'day' | 'night' | 'dusk';

// 图层可见性配置
export interface LayerVisibility {
    [layerId: string]: boolean;
}

// LOD配置
export interface LODConfig {
    levels: LODLevel[];
    strategy: 'distance' | 'zoom' | 'feature-count';
}

export interface LODLevel {
    minZoom: number;
    maxZoom: number;
    simplificationTolerance: number;
    maxFeatures?: number;
    visibility: {
        points: boolean;
        lines: boolean;
        polygons: boolean;
        text: boolean;
    };
}

// 本地化配置
export interface LocalizationConfig {
    defaultLanguage: string;
    supportedLanguages: string[];
    attributeMapping: Record<string, Record<string, string>>; // lang -> attribute -> displayName
}

// 图层配置
export interface S57LayerConfig {
    id: string;
    source: string;
    sourceLayer?: string;
    type: string;
    minzoom?: number;
    maxzoom?: number;
    filter?: mapboxgl.Expression;
    layout?: any;
    paint?: any;
    metadata?: any;
}

// 符号集
export interface SymbolSet {
    version: string;
    symbols: Record<string, SymbolDefinition>;
}

export interface SymbolDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    svgPath?: string;
    iconPath?: string;
    defaultSize: number;
    anchor: [number, number]; // 锚点位置 [x, y] 0-1范围
    colorizable: boolean;
    variants?: SymbolVariant[];
}

export interface SymbolVariant {
    id: string;
    name: string;
    conditions: Record<string, any>; // 属性条件
    overrides: Partial<SymbolDefinition>;
}

// 样式生成选项
export interface StyleGenerationOptions {
    theme: S57Theme;
    locale: string;
    lodLevel: number;
    customization?: Partial<S57StyleConfig>;
    symbolSet?: SymbolSet;
    colorPalette?: Partial<S57ColorPalette>;
} 