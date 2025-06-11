import mapboxgl from 'mapbox-gl';
import type { S57Config } from '../types/config';
import type {
    S57StyleConfig,
    S57Theme,
    S57ColorPalette,
    SymbolSet,
    StyleGenerationOptions
} from '../types/style';
import { getDefaultColorPalette } from '../styles/colors';
import { getDefaultSymbolSet } from '../styles/symbols';

/**
 * 样式管理器
 * 负责S57海图样式的生成、切换和管理
 */
export class StyleManager {
    private map: mapboxgl.Map;
    private config: S57Config;
    private currentTheme: S57Theme;
    private colorPalette: S57ColorPalette;
    private symbolSet: SymbolSet;
    private styleCache: Map<string, mapboxgl.Style> = new Map();

    constructor(map: mapboxgl.Map, config: S57Config) {
        this.map = map;
        this.config = config;
        this.currentTheme = config.rendering.theme;
        this.colorPalette = getDefaultColorPalette();
        this.symbolSet = getDefaultSymbolSet();
    }

    /**
     * 初始化样式管理器
     */
    async initialize(): Promise<void> {
        try {
            // 加载符号集
            if (this.config.rendering.symbols.symbolSetUrl) {
                this.symbolSet = await this.loadSymbolSet(this.config.rendering.symbols.symbolSetUrl);
            }

            // 生成初始样式
            await this.generateStyles();
        } catch (error) {
            throw new Error(`样式管理器初始化失败: ${error}`);
        }
    }

    /**
     * 应用主题
     */
    async applyTheme(theme: S57Theme): Promise<void> {
        try {
            this.currentTheme = theme;

            // 更新颜色调色板
            this.colorPalette = this.getThemeColorPalette(theme);

            // 重新生成样式
            await this.generateStyles();

            // 应用到地图
            await this.applyStylesToMap();
        } catch (error) {
            throw new Error(`应用主题失败: ${error}`);
        }
    }

    /**
     * 应用S57样式到指定数据源
     */
    async applyS57Styles(sourceId: string): Promise<void> {
        try {
            const layers = this.generateS57Layers(sourceId);

            // 添加图层到地图
            for (const layer of layers) {
                if (!this.map.getLayer(layer.id)) {
                    this.map.addLayer(layer);
                }
            }
        } catch (error) {
            throw new Error(`应用S57样式失败: ${error}`);
        }
    }

    /**
     * 刷新样式
     */
    async refreshStyles(): Promise<void> {
        await this.generateStyles();
        await this.applyStylesToMap();
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme(): S57Theme {
        return this.currentTheme;
    }

    /**
     * 获取颜色调色板
     */
    getColorPalette(): S57ColorPalette {
        return this.colorPalette;
    }

    /**
     * 更新图层样式
     */
    updateLayerStyle(layerId: string, property: string, value: any): void {
        if (this.map.getLayer(layerId)) {
            this.map.setPaintProperty(layerId, property as any, value);
        }
    }

    /**
     * 生成样式
     */
    private async generateStyles(): Promise<void> {
        const options: StyleGenerationOptions = {
            theme: this.currentTheme,
            locale: this.config.localization.defaultLanguage,
            lodLevel: 0,
            colorPalette: this.colorPalette,
            symbolSet: this.symbolSet,
            customization: this.config.rendering.styleConfig
        };

        // 清空样式缓存
        this.styleCache.clear();

        // 为每个主题生成样式
        const themes: S57Theme[] = ['day', 'night', 'dusk'];
        for (const theme of themes) {
            const themeOptions = { ...options, theme };
            const style = this.generateThemeStyle(themeOptions);
            this.styleCache.set(theme, style);
        }
    }

    /**
     * 生成主题样式
     */
    private generateThemeStyle(options: StyleGenerationOptions): mapboxgl.Style {
        const basePalette = this.getThemeColorPalette(options.theme);
        const palette = options.colorPalette ? { ...basePalette, ...options.colorPalette } : basePalette;

        return {
            version: 8,
            name: `S57 ${options.theme.charAt(0).toUpperCase() + options.theme.slice(1)} Theme`,
            sources: {},
            layers: [
                // 背景层
                {
                    id: 'background',
                    type: 'background',
                    paint: {
                        'background-color': this.getBackgroundColor(options.theme || 'day', palette)
                    }
                }
            ],
            sprite: this.config.rendering.symbols.symbolSetUrl,
            glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf'
        };
    }

    /**
     * 生成S57图层
     */
    private generateS57Layers(sourceId: string): mapboxgl.LayerSpecification[] {
        const layers: mapboxgl.LayerSpecification[] = [];
        const styleConfig = this.config.rendering.styleConfig;

        // 水域区域图层
        layers.push({
            id: `${sourceId}-water-areas`,
            type: 'fill',
            source: sourceId,
            'source-layer': 'water_areas',
            paint: {
                'fill-color': styleConfig.water.backgroundColor,
                'fill-opacity': styleConfig.water.opacity
            }
        });

        // 陆地区域图层
        layers.push({
            id: `${sourceId}-land-areas`,
            type: 'fill',
            source: sourceId,
            'source-layer': 'land_areas',
            paint: {
                'fill-color': styleConfig.land.fillColor,
                'fill-opacity': styleConfig.land.opacity,
                'fill-outline-color': styleConfig.land.strokeColor
            }
        });

        // 水深区域图层
        layers.push({
            id: `${sourceId}-depth-areas`,
            type: 'fill',
            source: sourceId,
            'source-layer': 'depth_areas',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'DRVAL1'],
                    ...this.createDepthColorStops()
                ],
                'fill-opacity': styleConfig.depths.areas.opacity
            }
        });

        // 等深线图层
        layers.push({
            id: `${sourceId}-depth-contours`,
            type: 'line',
            source: sourceId,
            'source-layer': 'depth_contours',
            paint: {
                'line-color': styleConfig.depths.contourLines.color,
                'line-width': styleConfig.depths.contourLines.width,
                'line-dasharray': styleConfig.depths.contourLines.dashArray || [1, 0]
            }
        });

        // 海岸线图层
        layers.push({
            id: `${sourceId}-coastlines`,
            type: 'line',
            source: sourceId,
            'source-layer': 'coastlines',
            paint: {
                'line-color': this.colorPalette.topography.land,
                'line-width': 2
            }
        });

        // 测深点图层
        layers.push({
            id: `${sourceId}-soundings`,
            type: 'symbol',
            source: sourceId,
            'source-layer': 'soundings',
            layout: {
                'text-field': ['get', 'VALDCO'],
                'text-font': styleConfig.depths.soundings.textFont,
                'text-size': styleConfig.depths.soundings.textSize,
                'text-anchor': 'center'
            },
            paint: {
                'text-color': styleConfig.depths.soundings.textColor,
                'text-halo-color': styleConfig.depths.soundings.haloColor,
                'text-halo-width': styleConfig.depths.soundings.haloWidth
            }
        });

        // 导航设施图层
        layers.push({
            id: `${sourceId}-navigation-points`,
            type: 'symbol',
            source: sourceId,
            'source-layer': 'navigation_points',
            layout: {
                'icon-image': [
                    'case',
                    ['==', ['get', 'OBJL'], 'LIGHTS'], 'light',
                    ['==', ['get', 'OBJL'], 'BCNCAR'], 'beacon',
                    ['==', ['get', 'OBJL'], 'BOYCAR'], 'buoy',
                    'marker'
                ],
                'icon-size': this.config.rendering.symbols.iconSize / 32,
                'icon-allow-overlap': true
            }
        });

        // 危险物图层
        layers.push({
            id: `${sourceId}-hazards`,
            type: 'symbol',
            source: sourceId,
            'source-layer': 'hazards',
            layout: {
                'icon-image': [
                    'case',
                    ['==', ['get', 'OBJL'], 'WRECKS'], 'wreck',
                    ['==', ['get', 'OBJL'], 'OBSTRN'], 'obstruction',
                    ['==', ['get', 'OBJL'], 'UWTROC'], 'rock',
                    'hazard'
                ],
                'icon-size': this.config.rendering.symbols.iconSize / 32,
                'icon-allow-overlap': true
            }
        });

        // 文字标注图层
        layers.push({
            id: `${sourceId}-labels`,
            type: 'symbol',
            source: sourceId,
            'source-layer': 'labels',
            layout: {
                'text-field': ['get', 'OBJNAM'],
                'text-font': styleConfig.text.fontFamily,
                'text-size': styleConfig.text.fontSize.min,
                'text-anchor': styleConfig.text.anchor,
                'text-offset': styleConfig.text.offset || [0, 0]
            },
            paint: {
                'text-color': styleConfig.text.color,
                'text-halo-color': styleConfig.text.haloColor,
                'text-halo-width': styleConfig.text.haloWidth
            }
        });

        return layers;
    }

    /**
     * 创建水深颜色插值点
     */
    private createDepthColorStops(): any[] {
        const stops = this.config.rendering.styleConfig.depths.areas.colorStops;
        const result: any[] = [];

        for (const [depth, color] of stops) {
            result.push(depth, color);
        }

        return result;
    }

    /**
     * 应用样式到地图
     */
    private async applyStylesToMap(): Promise<void> {
        const style = this.styleCache.get(this.currentTheme);
        if (style) {
            // 保存当前数据源
            const sources = this.map.getStyle().sources;

            // 应用新样式
            this.map.setStyle(style);

            // 等待样式加载完成后恢复数据源
            this.map.once('styledata', () => {
                // 重新添加数据源
                Object.entries(sources).forEach(([id, source]) => {
                    if (!this.map.getSource(id)) {
                        this.map.addSource(id, source);
                    }
                });
            });
        }
    }

    /**
     * 获取主题颜色调色板
     */
    private getThemeColorPalette(theme: S57Theme): S57ColorPalette {
        const base = getDefaultColorPalette();

        switch (theme) {
            case 'night':
                return {
                    ...base,
                    depths: {
                        shallow: '#1a1a2e',
                        medium: '#16213e',
                        deep: '#0f3460',
                        veryDeep: '#0e2954'
                    },
                    text: {
                        primary: '#ffffff',
                        secondary: '#cccccc',
                        depth: '#ffff00',
                        warning: '#ff6b6b'
                    }
                };
            case 'dusk':
                return {
                    ...base,
                    depths: {
                        shallow: '#4a4458',
                        medium: '#3d3c56',
                        deep: '#2f2f54',
                        veryDeep: '#1e1e3f'
                    },
                    text: {
                        primary: '#f0f0f0',
                        secondary: '#d0d0d0',
                        depth: '#ffeb3b',
                        warning: '#ff8a65'
                    }
                };
            default: // day
                return base;
        }
    }

    /**
     * 获取背景颜色
     */
    private getBackgroundColor(theme: S57Theme, palette: S57ColorPalette): string {
        switch (theme) {
            case 'night':
                return '#0a0a0a';
            case 'dusk':
                return '#2c2c54';
            default: // day
                return palette.depths.shallow;
        }
    }

    /**
     * 加载符号集
     */
    private async loadSymbolSet(url: string): Promise<SymbolSet> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`加载符号集失败，使用默认符号集: ${error}`);
            return getDefaultSymbolSet();
        }
    }
} 