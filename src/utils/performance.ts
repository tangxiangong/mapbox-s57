import type { PerformanceStats, MemoryStats, MonitoringConfig } from '../types/config';

/**
 * 性能监控器
 * 负责监控和统计渲染性能、内存使用等指标
 */
export class PerformanceMonitor {
    private config: MonitoringConfig;
    private stats: PerformanceStats;
    private timers: Map<string, number> = new Map();
    private frameCount = 0;
    private lastFrameTime = 0;
    private isRunning = false;

    constructor(config: MonitoringConfig) {
        this.config = config;
        this.stats = this.initializeStats();
    }

    /**
     * 初始化统计数据
     */
    private initializeStats(): PerformanceStats {
        return {
            fps: 0,
            frameTime: 0,
            renderTime: 0,
            updateTime: 0,
            networkRequests: 0,
            activeConnections: 0,
            memoryUsage: {
                totalMemory: 0,
                usedMemory: 0,
                tileCache: 0,
                symbolCache: 0,
                textureCache: 0,
                bufferMemory: 0
            }
        };
    }

    /**
     * 开始计时器
     */
    startTimer(name: string): void {
        this.timers.set(name, performance.now());
    }

    /**
     * 结束计时器并记录时间
     */
    endTimer(name: string): number {
        const startTime = this.timers.get(name);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.timers.delete(name);

            // 更新对应的统计数据
            switch (name) {
                case 'render':
                    this.stats.renderTime = duration;
                    break;
                case 'update':
                    this.stats.updateTime = duration;
                    break;
                default:
                    // 记录到调试日志
                    if (this.config.debugMode) {
                        console.debug(`Timer ${name}: ${duration.toFixed(2)}ms`);
                    }
                    break;
            }

            return duration;
        }
        return 0;
    }

    /**
     * 记录错误
     */
    recordError(operation: string, error: Error): void {
        if (this.config.errorReporting) {
            console.error(`Performance Monitor - ${operation}:`, error);
        }
    }

    /**
     * 更新FPS
     */
    updateFPS(fps: number): void {
        this.stats.fps = fps;
    }

    /**
     * 记录渲染帧
     */
    recordRenderFrame(): void {
        const currentTime = performance.now();

        if (this.lastFrameTime > 0) {
            this.stats.frameTime = currentTime - this.lastFrameTime;
        }

        this.lastFrameTime = currentTime;
        this.frameCount++;
    }

    /**
     * 记录数据加载
     */
    recordDataLoad(sourceId: string): void {
        this.stats.networkRequests++;

        if (this.config.debugMode) {
            console.debug(`Data loaded for source: ${sourceId}`);
        }
    }

    /**
     * 更新内存统计
     */
    updateMemoryStats(): void {
        if ('memory' in performance) {
            const memInfo = (performance as any).memory;
            this.stats.memoryUsage.totalMemory = memInfo.totalJSHeapSize || 0;
            this.stats.memoryUsage.usedMemory = memInfo.usedJSHeapSize || 0;
        }

        // 估算各组件的内存使用
        this.estimateComponentMemory();
    }

    /**
     * 估算组件内存使用
     */
    private estimateComponentMemory(): void {
        // 这里可以实现更精确的内存估算逻辑
        // 目前使用简单的估算方法
        const totalUsed = this.stats.memoryUsage.usedMemory;

        // 假设分布比例
        this.stats.memoryUsage.tileCache = Math.floor(totalUsed * 0.4);
        this.stats.memoryUsage.symbolCache = Math.floor(totalUsed * 0.1);
        this.stats.memoryUsage.textureCache = Math.floor(totalUsed * 0.2);
        this.stats.memoryUsage.bufferMemory = Math.floor(totalUsed * 0.3);
    }

    /**
     * 获取性能统计
     */
    getStats(): PerformanceStats {
        return { ...this.stats };
    }

    /**
     * 重置统计数据
     */
    resetStats(): void {
        this.stats = this.initializeStats();
        this.frameCount = 0;
        this.lastFrameTime = 0;
    }

    /**
     * 开始监控
     */
    start(): void {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startPerformanceLoop();
        }
    }

    /**
     * 停止监控
     */
    stop(): void {
        this.isRunning = false;
    }

    /**
     * 启动性能监控循环
     */
    private startPerformanceLoop(): void {
        const updateInterval = 1000; // 1秒更新一次

        const update = () => {
            if (!this.isRunning) return;

            this.updateMemoryStats();

            // 记录性能指标
            if (this.config.performanceMetrics) {
                this.logPerformanceMetrics();
            }

            setTimeout(update, updateInterval);
        };

        update();
    }

    /**
     * 记录性能指标
     */
    private logPerformanceMetrics(): void {
        if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
            const stats = this.getStats();
            console.log('Performance Stats:', {
                fps: stats.fps,
                frameTime: `${stats.frameTime.toFixed(2)}ms`,
                memoryUsage: `${(stats.memoryUsage.usedMemory / 1024 / 1024).toFixed(2)}MB`,
                networkRequests: stats.networkRequests
            });
        }
    }

    /**
     * 获取性能报告
     */
    generateReport(): string {
        const stats = this.getStats();
        const memoryMB = (stats.memoryUsage.usedMemory / 1024 / 1024).toFixed(2);

        return `
性能报告:
- FPS: ${stats.fps}
- 帧时间: ${stats.frameTime.toFixed(2)}ms
- 渲染时间: ${stats.renderTime.toFixed(2)}ms
- 更新时间: ${stats.updateTime.toFixed(2)}ms
- 内存使用: ${memoryMB}MB
- 网络请求: ${stats.networkRequests}
- 活动连接: ${stats.activeConnections}
    `.trim();
    }

    /**
     * 检查性能警告
     */
    checkPerformanceWarnings(): string[] {
        const warnings: string[] = [];
        const stats = this.getStats();

        // 检查FPS
        if (stats.fps > 0 && stats.fps < 30) {
            warnings.push(`FPS过低: ${stats.fps}`);
        }

        // 检查帧时间
        if (stats.frameTime > 33) { // 30 FPS = 33ms per frame
            warnings.push(`帧时间过长: ${stats.frameTime.toFixed(2)}ms`);
        }

        // 检查内存使用
        const memoryMB = stats.memoryUsage.usedMemory / 1024 / 1024;
        if (memoryMB > 500) { // 500MB警告阈值
            warnings.push(`内存使用过高: ${memoryMB.toFixed(2)}MB`);
        }

        return warnings;
    }

    /**
     * 获取内存使用百分比
     */
    getMemoryUsagePercentage(): number {
        const { usedMemory, totalMemory } = this.stats.memoryUsage;
        if (totalMemory === 0) return 0;
        return (usedMemory / totalMemory) * 100;
    }

    /**
     * 清理性能数据
     */
    cleanup(): void {
        this.stop();
        this.timers.clear();
        this.resetStats();
    }
} 