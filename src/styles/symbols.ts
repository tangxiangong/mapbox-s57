import type { SymbolSet } from '../types/style';

/**
 * 获取默认符号集
 */
export function getDefaultSymbolSet(): SymbolSet {
    return {
        version: '1.0.0',
        symbols: {
            // 灯塔符号
            'light': {
                id: 'light',
                name: '灯塔',
                category: 'navigation',
                description: '导航灯塔',
                defaultSize: 16,
                anchor: [0.5, 1.0],
                colorizable: true,
                variants: [
                    {
                        id: 'light-red',
                        name: '红色灯塔',
                        conditions: { COLOUR: [3] }, // 红色
                        overrides: { defaultSize: 18 }
                    },
                    {
                        id: 'light-green',
                        name: '绿色灯塔',
                        conditions: { COLOUR: [4] }, // 绿色
                        overrides: { defaultSize: 18 }
                    }
                ]
            },

            // 浮标符号
            'buoy': {
                id: 'buoy',
                name: '浮标',
                category: 'navigation',
                description: '导航浮标',
                defaultSize: 12,
                anchor: [0.5, 0.5],
                colorizable: true,
                variants: [
                    {
                        id: 'buoy-lateral-port',
                        name: '左舷标',
                        conditions: { CATBUA: [2] },
                        overrides: { defaultSize: 14 }
                    },
                    {
                        id: 'buoy-lateral-starboard',
                        name: '右舷标',
                        conditions: { CATBUA: [1] },
                        overrides: { defaultSize: 14 }
                    }
                ]
            },

            // 立标符号
            'beacon': {
                id: 'beacon',
                name: '立标',
                category: 'navigation',
                description: '导航立标',
                defaultSize: 14,
                anchor: [0.5, 1.0],
                colorizable: true
            },

            // 沉船符号
            'wreck': {
                id: 'wreck',
                name: '沉船',
                category: 'hazard',
                description: '沉船残骸',
                defaultSize: 16,
                anchor: [0.5, 0.5],
                colorizable: false
            },

            // 障碍物符号
            'obstruction': {
                id: 'obstruction',
                name: '障碍物',
                category: 'hazard',
                description: '水下障碍物',
                defaultSize: 12,
                anchor: [0.5, 0.5],
                colorizable: false
            },

            // 岩石符号
            'rock': {
                id: 'rock',
                name: '岩石',
                category: 'hazard',
                description: '水下岩石',
                defaultSize: 10,
                anchor: [0.5, 0.5],
                colorizable: false
            },

            // 锚地符号
            'anchorage': {
                id: 'anchorage',
                name: '锚地',
                category: 'area',
                description: '锚泊区域',
                defaultSize: 18,
                anchor: [0.5, 0.5],
                colorizable: false
            },

            // 通用标记符号
            'marker': {
                id: 'marker',
                name: '标记',
                category: 'general',
                description: '通用标记',
                defaultSize: 8,
                anchor: [0.5, 0.5],
                colorizable: true
            },

            // 危险符号
            'hazard': {
                id: 'hazard',
                name: '危险',
                category: 'hazard',
                description: '一般危险',
                defaultSize: 14,
                anchor: [0.5, 0.5],
                colorizable: false
            }
        }
    };
} 