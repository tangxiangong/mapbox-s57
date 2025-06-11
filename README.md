# Mapbox S-57 海图渲染系统

一个基于 Mapbox GL JS v3.12 的高性能、生产级别的 S-57 标准海图渲染系统。该系统将海事导航数据转换为矢量切片格式，并通过优化的样式配置实现美观且高效的海图可视化。

## ✨ 特性

- 🚀 **高性能渲染** - 基于 WebGL 的矢量切片渲染
- 🎨 **多主题支持** - 支持白天、夜间、黄昏三种主题
- 📱 **响应式设计** - 适配桌面和移动设备
- 🔧 **高度可配置** - 丰富的配置选项和自定义能力
- 📊 **性能监控** - 内置性能监控和优化建议
- 🌍 **国际化支持** - 支持多语言本地化
- 🎯 **标准兼容** - 严格遵循 S-57 和 IHO S-52 标准

## 🚀 快速开始

### 安装依赖

```bash
# 使用 Bun 安装依赖
bun install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器
bun run dev

# 或使用 npm
npm run dev
```

### 构建生产版本

```bash
# 构建项目
bun run build

# 预览构建结果
bun run preview
```

## 📖 使用指南

### 基础使用

```typescript
import { createS57Renderer } from 'mapbox-s57';

// 创建渲染器
const renderer = await createS57Renderer('map-container', {
  map: {
    center: [120.0, 30.0],
    zoom: 8
  }
});

// 加载 S57 数据
await renderer.loadS57Tiles('chart-data', '/data/tiles/chart.mbtiles');
```

### 高级配置

```typescript
import { S57MapRenderer, S57Config } from 'mapbox-s57';

const config: S57Config = {
  map: {
    container: 'map',
    center: [120.0, 30.0],
    zoom: 8
  },
  rendering: {
    theme: 'day',
    antialiasing: true,
    symbols: {
      iconSize: 16,
      collisionDetection: true
    }
  },
  performance: {
    optimization: {
      batchRendering: true,
      frustumCulling: true
    }
  }
};

const renderer = new S57MapRenderer(config);
await renderer.initialize();
```

### 事件处理

```typescript
const interactionManager = renderer.getInteractionManager();

// 监听要素点击事件
interactionManager.addEventListener('click', (event) => {
  console.log('点击的要素:', event.features);
});

// 监听要素悬停事件
interactionManager.addEventListener('hover', (event) => {
  // 处理悬停效果
});
```

### 主题切换

```typescript
// 切换到夜间主题
await renderer.updateStyle('night');

// 切换到黄昏主题
await renderer.updateStyle('dusk');
```

## 🛠️ 数据处理

### S57 数据验证

```bash
# 验证 S57 数据文件
bun run validate-s57 --input ./data/s57 --recursive

# 输出 JSON 格式报告
bun run validate-s57 --input ./data/s57 --format json
```

### 数据转换

```bash
# 转换 S57 数据为矢量切片
bun run convert --input ./data/s57 --output ./dist/tiles

# 优化生成的切片
bun run optimize --tiles ./dist/tiles/chart.mbtiles
```

## 📁 项目结构

```
mapbox-s57/
├── src/
│   ├── core/                 # 核心渲染引擎
│   │   ├── renderer.ts       # 主渲染器
│   │   ├── style-manager.ts  # 样式管理
│   │   ├── layer-manager.ts  # 图层管理
│   │   └── interaction-manager.ts # 交互管理
│   ├── types/                # TypeScript 类型定义
│   │   ├── s57.ts           # S57 相关类型
│   │   ├── style.ts         # 样式类型
│   │   └── config.ts        # 配置类型
│   ├── styles/               # 样式配置
│   │   ├── base.ts          # 基础样式
│   │   ├── colors.ts        # 颜色配置
│   │   └── symbols.ts       # 符号定义
│   ├── utils/                # 工具函数
│   │   └── performance.ts   # 性能监控
│   └── index.ts              # 主要导出接口
├── scripts/                  # 构建和工具脚本
│   ├── convert.ts           # 数据转换
│   ├── validate-s57.ts     # S57 验证
│   └── optimize.ts          # 性能优化
├── data/                     # 数据目录
│   ├── s57/                 # 原始 S57 数据
│   └── symbols/             # 海图符号资源
└── dist/                     # 构建输出
```

## 🔧 配置选项

### 地图配置

```typescript
interface MapConfig {
  container: string | HTMLElement;  // 地图容器
  center?: [number, number];        // 初始中心点
  zoom?: number;                    // 初始缩放级别
  minZoom?: number;                 // 最小缩放级别
  maxZoom?: number;                 // 最大缩放级别
  bounds?: [[number, number], [number, number]]; // 边界限制
}
```

### 渲染配置

```typescript
interface RenderingConfig {
  theme: 'day' | 'night' | 'dusk';  // 主题
  antialiasing: boolean;            // 抗锯齿
  highDPI: boolean;                 // 高分辨率支持
  symbols: SymbolRenderingConfig;   // 符号渲染配置
}
```

### 性能配置

```typescript
interface PerformanceConfig {
  optimization: {
    batchRendering: boolean;        // 批量渲染
    frustumCulling: boolean;        // 视锥裁剪
    levelOfDetail: boolean;         // 细节层次
  };
  memory: {
    tileCacheSize: number;          // 切片缓存大小(MB)
    cleanupInterval: number;        // 清理间隔(ms)
  };
}
```

## 🎨 样式自定义

### 颜色配置

```typescript
const customColors = {
  depths: {
    shallow: '#E6F3FF',
    medium: '#B3D9FF',
    deep: '#0066CC',
    veryDeep: '#003366'
  },
  navigation: {
    safeWater: '#00AA00',
    danger: '#FF0000'
  }
};
```

### 符号自定义

```typescript
const customSymbols = {
  light: {
    id: 'light',
    size: 18,
    color: '#FFFF00'
  },
  buoy: {
    id: 'buoy',
    size: 12,
    colorMap: {
      1: '#FF0000', // 红色
      2: '#00FF00'  // 绿色
    }
  }
};
```

## 📊 性能监控

系统内置性能监控功能，可以实时监控：

- FPS (帧率)
- 内存使用情况
- 网络请求状态
- 渲染时间统计

```typescript
const stats = renderer.getPerformanceStats();
console.log('FPS:', stats.fps);
console.log('内存使用:', stats.memoryUsage.usedMemory / 1024 / 1024, 'MB');
```

## 🌍 国际化

系统支持多语言本地化：

```typescript
const localization = {
  defaultLanguage: 'zh-CN',
  supportedLanguages: ['zh-CN', 'en-US'],
  attributeMapping: {
    'zh-CN': {
      'OBJNAM': '对象名称',
      'VALDCO': '水深值'
    },
    'en-US': {
      'OBJNAM': 'Object Name',
      'VALDCO': 'Depth Value'
    }
  }
};
```

## 🔍 调试和故障排除

### 启用调试模式

```typescript
const config = {
  performance: {
    monitoring: {
      debugMode: true,
      logLevel: 'debug'
    }
  }
};
```

### 性能警告检查

```typescript
const monitor = renderer.getPerformanceMonitor();
const warnings = monitor.checkPerformanceWarnings();
warnings.forEach(warning => console.warn(warning));
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js) - 优秀的地图渲染库
- [IHO S-57 标准](https://iho.int/) - 国际海事组织标准
- [Bun](https://bun.sh/) - 快速的 JavaScript 运行时

## 📞 支持

如果您遇到问题或有疑问，请：

1. 查看 [文档](docs/)
2. 搜索现有的 [Issues](issues)
3. 创建新的 [Issue](issues/new)

---

**注意**: 本项目仍在积极开发中，API 可能会发生变化。生产使用请谨慎评估。
