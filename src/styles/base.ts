import type { S57StyleConfig } from '../types/style';
import { getDefaultColorPalette } from './colors';

/**
 * 获取默认S57样式配置
 */
export function getDefaultStyleConfig(): S57StyleConfig {
    const palette = getDefaultColorPalette();

    return {
        // 水域样式
        water: {
            backgroundColor: palette.depths.shallow,
            opacity: 1.0
        },

        // 陆地样式  
        land: {
            fillColor: palette.topography.land,
            strokeColor: '#B8860B',
            strokeWidth: 1,
            opacity: 1.0
        },

        // 水深样式
        depths: {
            contourLines: {
                color: palette.depths.deep,
                width: 1,
                dashArray: [2, 2]
            },
            areas: {
                colorStops: [
                    [0, palette.depths.shallow],
                    [5, palette.depths.medium],
                    [20, palette.depths.deep],
                    [200, palette.depths.veryDeep]
                ],
                opacity: 0.7
            },
            soundings: {
                textColor: palette.text.depth,
                textSize: 10,
                textFont: ['Arial', 'sans-serif'],
                haloColor: '#FFFFFF',
                haloWidth: 1
            }
        },

        // 导航样式
        navigation: {
            channels: {
                color: palette.navigation.safeWater,
                width: 3,
                dashArray: [5, 3]
            },
            anchorages: {
                fillColor: '#FFD700',
                strokeColor: '#DAA520',
                strokeWidth: 2,
                opacity: 0.3
            },
            restrictedAreas: {
                fillColor: palette.navigation.prohibited,
                strokeColor: palette.navigation.danger,
                strokeWidth: 2,
                opacity: 0.2,
                pattern: 'diagonal-stripes'
            }
        },

        // 危险物样式
        hazards: {
            wrecks: {
                symbolId: 'wreck',
                size: 16,
                color: palette.navigation.danger
            },
            rocks: {
                symbolId: 'rock',
                size: 12,
                color: palette.topography.rock
            },
            obstructions: {
                symbolId: 'obstruction',
                size: 14,
                color: palette.navigation.caution
            }
        },

        // 灯光样式
        lighting: {
            lights: {
                symbolId: 'light',
                size: 18,
                color: '#FFFF00',
                sectors: {
                    fillColor: '#FFFF00',
                    strokeColor: '#FFD700',
                    opacity: 0.1
                }
            },
            beacons: {
                symbolId: 'beacon',
                size: 14,
                color: '#FF6600'
            },
            buoys: {
                symbolId: 'buoy',
                size: 12,
                colorMap: {
                    1: '#FF0000', // 红色
                    2: '#000000', // 黑色
                    3: '#00FF00', // 绿色
                    4: '#FFFF00', // 黄色
                    5: '#FFFFFF', // 白色
                    6: '#FFA500'  // 橙色
                }
            }
        },

        // 符号样式
        symbols: {
            iconSize: 1.0,
            iconOpacity: 1.0,
            iconAnchor: 'center',
            iconRotationAlignment: 'map',
            symbolPlacement: 'point',
            iconAllowOverlap: false,
            iconIgnorePlacement: false
        },

        // 文字样式
        text: {
            fontFamily: ['Arial', 'Helvetica', 'sans-serif'],
            fontSize: {
                min: 10,
                max: 16,
                step: 2
            },
            color: palette.text.primary,
            haloColor: '#FFFFFF',
            haloWidth: 1,
            collision: 'auto',
            placement: 'point',
            anchor: 'center'
        }
    };
} 