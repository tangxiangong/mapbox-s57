import type { S57ColorPalette } from '../types/style';

/**
 * 获取默认颜色调色板
 */
export function getDefaultColorPalette(): S57ColorPalette {
    return {
        // 水深颜色渐变
        depths: {
            shallow: '#E6F3FF',
            medium: '#B3D9FF',
            deep: '#0066CC',
            veryDeep: '#003366'
        },
        // 导航要素
        navigation: {
            safeWater: '#00AA00',
            caution: '#FFAA00',
            danger: '#FF0000',
            prohibited: '#CC0000'
        },
        // 地形要素
        topography: {
            land: '#F5F5DC',
            rock: '#8B7D6B',
            sand: '#F4A460',
            mud: '#696969'
        },
        // 文字颜色
        text: {
            primary: '#000000',
            secondary: '#666666',
            depth: '#0066CC',
            warning: '#FF0000'
        }
    };
} 