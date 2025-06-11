import './style.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { S57MapRenderer } from './core/renderer';
import type { S57Config } from './types/config';
import { getDefaultStyleConfig } from './styles/base';

// 禁用 Mapbox token 验证，使用离线模式
(mapboxgl as any).accessToken = undefined;


/**
 * 创建默认配置
 */
function createDefaultConfig(): S57Config {
  return {
    map: {
      container: 'map',
      center: [120.0, 30.0], // 中国东海区域
      zoom: 8,
      minZoom: 1,
      maxZoom: 18
    },
    data: {
      s57Sources: [],
      staticTiles: false,
      cacheSize: 100,
      preloadZoomLevels: [6, 8, 10]
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
            visibility: {
              points: true,
              lines: true,
              polygons: true,
              text: false
            }
          },
          {
            minZoom: 8,
            maxZoom: 12,
            simplificationTolerance: 0.0005,
            visibility: {
              points: true,
              lines: true,
              polygons: true,
              text: true
            }
          },
          {
            minZoom: 12,
            maxZoom: 22,
            simplificationTolerance: 0.0001,
            visibility: {
              points: true,
              lines: true,
              polygons: true,
              text: true
            }
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
      preserveDrawingBuffer: false
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
        tileCacheSize: 50, // MB
        symbolCacheSize: 10, // MB
        maxRetainedTiles: 200,
        cleanupInterval: 30000 // 30秒
      },
      network: {
        maxConcurrentRequests: 6,
        retryAttempts: 3,
        timeout: 10000, // 10秒
        compression: 'gzip'
      },
      monitoring: {
        performanceMetrics: true,
        errorReporting: true,
        debugMode: false,
        logLevel: 'info'
      }
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
      }
    }
  };
}

/**
 * 初始化应用程序
 */
async function initializeApp() {
  try {
    // 显示加载状态
    showLoadingState('正在初始化海图渲染引擎...');

    // 创建配置
    const config = createDefaultConfig();

    // 创建渲染器
    const renderer = new S57MapRenderer(config);

    // 初始化渲染器
    await renderer.initialize();

    // 设置交互事件处理器
    setupInteractionHandlers(renderer);

    // 创建用户界面
    createUserInterface(renderer);

    // 加载示例数据
    await loadSampleData(renderer);

    // 隐藏加载状态
    hideLoadingState();

    console.log('S57海图渲染系统初始化完成');

  } catch (error) {
    console.error('初始化失败:', error);
    showErrorState('系统初始化失败: ' + error);
  }
}

/**
 * 设置交互事件处理器
 */
function setupInteractionHandlers(renderer: S57MapRenderer) {
  const interactionManager = renderer.getInteractionManager();

  // 点击事件
  interactionManager.addEventListener('click', (event) => {
    console.log('要素点击:', event.features);
  });

  // 悬停事件
  interactionManager.addEventListener('hover', (event) => {
    // 可以在这里添加悬停效果
  });

  // 选择事件
  interactionManager.addEventListener('select', (event) => {
    updateSelectedFeaturesPanel(event.features);
  });
}

/**
 * 创建用户界面
 */
function createUserInterface(renderer: S57MapRenderer) {
  // 创建控制面板
  createControlPanel(renderer);

  // 创建图层控制
  createLayerControl(renderer);

  // 创建性能监控面板
  createPerformancePanel(renderer);
}

/**
 * 创建控制面板
 */
function createControlPanel(renderer: S57MapRenderer) {
  const controlPanel = document.createElement('div');
  controlPanel.className = 'control-panel';
  controlPanel.innerHTML = `
    <h3>海图控制</h3>
    <div class="control-group">
      <label>主题:</label>
      <select id="theme-selector">
        <option value="day">白天</option>
        <option value="night">夜间</option>
        <option value="dusk">黄昏</option>
      </select>
    </div>
    <div class="control-group">
      <button id="reset-view">重置视图</button>
    </div>
  `;

  document.body.appendChild(controlPanel);

  // 主题切换
  const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement;
  themeSelector.addEventListener('change', async (e) => {
    const theme = (e.target as HTMLSelectElement).value as 'day' | 'night' | 'dusk';
    await renderer.updateStyle(theme);
  });

  // 重置视图
  const resetButton = document.getElementById('reset-view');
  resetButton?.addEventListener('click', () => {
    renderer.setViewport([
      [119.0, 29.0],
      [121.0, 31.0]
    ]);
  });
}

/**
 * 创建图层控制
 */
function createLayerControl(renderer: S57MapRenderer) {
  const layerControl = document.createElement('div');
  layerControl.className = 'layer-control';
  layerControl.innerHTML = `
    <h3>图层控制</h3>
    <div id="layer-list"></div>
  `;

  document.body.appendChild(layerControl);
}

/**
 * 创建性能监控面板
 */
function createPerformancePanel(renderer: S57MapRenderer) {
  const perfPanel = document.createElement('div');
  perfPanel.className = 'performance-panel';
  perfPanel.innerHTML = `
    <h3>性能监控</h3>
    <div id="performance-stats"></div>
  `;

  document.body.appendChild(perfPanel);

  // 定期更新性能统计
  setInterval(() => {
    const stats = renderer.getPerformanceStats();
    const statsDiv = document.getElementById('performance-stats');
    if (statsDiv) {
      statsDiv.innerHTML = `
        <p>FPS: ${stats.fps}</p>
        <p>帧时间: ${stats.frameTime.toFixed(2)}ms</p>
        <p>内存: ${(stats.memoryUsage.usedMemory / 1024 / 1024).toFixed(2)}MB</p>
        <p>网络请求: ${stats.networkRequests}</p>
      `;
    }
  }, 1000);
}

/**
 * 加载示例数据
 */
async function loadSampleData(renderer: S57MapRenderer) {
  try {
    // 检查本地切片服务器是否可用
    const response = await fetch('http://localhost:8080/health');
    if (response.ok) {
      // 加载各个海图数据
      await renderer.loadS57Tiles('C1313100', 'http://localhost:8080/C1313100/{z}/{x}/{y}.pbf');
      await renderer.loadS57Tiles('C1513179', 'http://localhost:8080/C1513179/{z}/{x}/{y}.pbf');
      await renderer.loadS57Tiles('C1613182', 'http://localhost:8080/C1613182/{z}/{x}/{y}.pbf');
      await renderer.loadS57Tiles('C1515591', 'http://localhost:8080/C1515591/{z}/{x}/{y}.pbf');
      await renderer.loadS57Tiles('C1100103', 'http://localhost:8080/C1100103/{z}/{x}/{y}.pbf');

      // 设置视图到长江口区域（最大的数据集区域）
      await renderer.setViewport([
        [121.100000, 30.716667],
        [123.650000, 32.250000]
      ]);

      console.log('✅ S57海图数据加载完成');
    } else {
      console.warn('⚠️ 切片服务器不可用，请先启动: bun run serve:tiles');
    }
  } catch (error) {
    console.warn('⚠️ 无法连接到本地切片服务器:', error);
    console.log('💡 请确保切片服务器已启动: bun run serve:tiles');
  }
}

/**
 * 更新选中要素面板
 */
function updateSelectedFeaturesPanel(features: any[]) {
  // 实现选中要素的信息展示
  console.log('选中要素:', features);
}

/**
 * 显示加载状态
 */
function showLoadingState(message: string) {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-state';
  loadingDiv.className = 'loading-overlay';
  loadingDiv.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(loadingDiv);
}

/**
 * 隐藏加载状态
 */
function hideLoadingState() {
  const loadingDiv = document.getElementById('loading-state');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

/**
 * 显示错误状态
 */
function showErrorState(message: string) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-overlay';
  errorDiv.innerHTML = `
    <div class="error-content">
      <h3>初始化错误</h3>
      <p>${message}</p>
      <button onclick="location.reload()">重新加载</button>
    </div>
  `;
  document.body.appendChild(errorDiv);
}

// 启动应用程序
document.addEventListener('DOMContentLoaded', initializeApp);