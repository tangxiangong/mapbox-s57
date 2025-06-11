#!/usr/bin/env bun
import { spawn } from 'child_process';
import fs from 'fs';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// 检查是否存在MBTiles文件
function checkMBTilesFiles(): boolean {
    const mbtilesDir = 'dist/mbtiles';

    try {
        if (!fs.existsSync(mbtilesDir)) {
            return false;
        }

        const files = fs.readdirSync(mbtilesDir);
        const mbtilesFiles = files.filter(file => file.endsWith('.mbtiles'));

        if (mbtilesFiles.length === 0) {
            return false;
        }

        log(`${colors.green}✓ 找到 ${mbtilesFiles.length} 个MBTiles文件:${colors.reset}`);
        mbtilesFiles.forEach(file => {
            log(`  - ${file}`, colors.cyan);
        });

        return true;
    } catch (error) {
        return false;
    }
}

// 启动切片服务器
function startTileServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        log(`${colors.blue}🚀 启动切片服务器...${colors.reset}`);

        const tileServer = spawn('bun', ['scripts/server.ts'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            detached: false
        });

        let serverStarted = false;

        tileServer.stdout?.on('data', (data) => {
            const output = data.toString();

            // 为切片服务器的输出添加前缀
            output.split('\n').forEach((line: string) => {
                if (line.trim()) {
                    console.log(`${colors.blue}[TILES]${colors.reset} ${line}`);
                }
            });

            // 检查服务器是否已启动
            if ((output.includes('瓦片服务器运行在') || output.includes('切片服务器已启动')) && !serverStarted) {
                serverStarted = true;
                resolve();
            }
        });

        tileServer.stderr?.on('data', (data) => {
            const output = data.toString();
            output.split('\n').forEach((line: string) => {
                if (line.trim()) {
                    console.log(`${colors.red}[TILES ERROR]${colors.reset} ${line}`);
                }
            });
        });

        tileServer.on('error', (error) => {
            log(`${colors.red}❌ 切片服务器启动失败: ${error.message}${colors.reset}`);
            reject(error);
        });

        // 如果5秒内没有启动成功，也认为成功（可能日志格式不同）
        setTimeout(() => {
            if (!serverStarted) {
                log(`${colors.yellow}⚠️  切片服务器可能已启动（未检测到启动日志）${colors.reset}`);
                resolve();
            }
        }, 5000);
    });
}

// 启动Vite开发服务器
function startViteServer(): void {
    log(`${colors.green}🌟 启动Vite开发服务器...${colors.reset}`);

    const viteServer = spawn('bun', ['vite'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        detached: false
    });

    viteServer.stdout?.on('data', (data) => {
        const output = data.toString();
        output.split('\n').forEach((line: string) => {
            if (line.trim()) {
                console.log(`${colors.green}[VITE]${colors.reset} ${line}`);
            }
        });
    });

    viteServer.stderr?.on('data', (data) => {
        const output = data.toString();
        output.split('\n').forEach((line: string) => {
            if (line.trim()) {
                console.log(`${colors.yellow}[VITE WARN]${colors.reset} ${line}`);
            }
        });
    });

    viteServer.on('error', (error) => {
        log(`${colors.red}❌ Vite服务器启动失败: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

// 主函数
async function main() {
    log(`${colors.bright}${colors.cyan}📊 Mapbox S-57 海图系统开发环境启动${colors.reset}\n`);

    // 检查MBTiles文件
    if (!checkMBTilesFiles()) {
        log(`${colors.yellow}⚠️  未找到MBTiles文件，请先运行数据转换:${colors.reset}`);
        log(`${colors.cyan}   bun run convert --input ./data/s57 --output ./dist --format mbtiles${colors.reset}\n`);

        // 询问是否继续
        const shouldContinue = await new Promise<boolean>((resolve) => {
            process.stdout.write(`${colors.yellow}是否继续启动开发服务器？(y/N): ${colors.reset}`);
            process.stdin.setEncoding('utf8');
            process.stdin.once('data', (data) => {
                const input = data.toString().trim().toLowerCase();
                resolve(input === 'y' || input === 'yes');
            });
        });

        if (!shouldContinue) {
            log(`${colors.red}❌ 用户取消启动${colors.reset}`);
            process.exit(0);
        }
    }

    try {
        // 启动切片服务器
        await startTileServer();

        // 等待1秒确保切片服务器完全启动
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 启动Vite开发服务器
        startViteServer();

        log(`\n${colors.bright}${colors.green}🎉 开发环境启动完成！${colors.reset}`);
        log(`${colors.cyan}前端应用: http://localhost:5173 (如果端口冲突会自动选择其他端口)${colors.reset}`);
        log(`${colors.cyan}切片服务: http://localhost:8080${colors.reset}`);
        log(`${colors.cyan}海图列表: http://localhost:8080/charts${colors.reset}\n`);

        // 监听退出信号
        process.on('SIGINT', () => {
            log(`\n${colors.yellow}🛑 正在关闭开发服务器...${colors.reset}`);
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            log(`\n${colors.yellow}🛑 正在关闭开发服务器...${colors.reset}`);
            process.exit(0);
        });

    } catch (error) {
        log(`${colors.red}❌ 启动失败: ${error}${colors.reset}`);
        process.exit(1);
    }
}

main().catch((error) => {
    log(`${colors.red}❌ 未处理的错误: ${error}${colors.reset}`);
    process.exit(1);
}); 