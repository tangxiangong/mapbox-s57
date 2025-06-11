#!/usr/bin/env bun
/**
 * S57数据验证脚本
 * 用于验证S57数据文件的完整性和正确性
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface ValidationOptions {
    inputDir: string;
    recursive: boolean;
    outputFormat: 'json' | 'text';
}

interface ValidationResult {
    file: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: {
        size: number;
        lastModified: Date;
        objectCount?: number;
    };
}

/**
 * 解析命令行参数
 */
function parseArgs(): ValidationOptions {
    const args = process.argv.slice(2);
    const options: ValidationOptions = {
        inputDir: './data/s57',
        recursive: false,
        outputFormat: 'text'
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
            case '-i':
                options.inputDir = args[++i];
                break;
            case '--recursive':
            case '-r':
                options.recursive = true;
                break;
            case '--format':
            case '-f':
                options.outputFormat = args[++i] as 'json' | 'text';
                break;
            case '--help':
            case '-h':
                printUsage();
                process.exit(0);
        }
    }

    return options;
}

/**
 * 打印使用说明
 */
function printUsage() {
    console.log(`
S57数据验证工具

用法: bun validate-s57.ts [选项]

选项:
  -i, --input <目录>     输入目录 (默认: ./data/s57)
  -r, --recursive        递归处理子目录
  -f, --format <格式>    输出格式 json|text (默认: text)
  -h, --help            显示帮助信息

示例:
  bun validate-s57.ts --input ./data/charts --recursive
  bun validate-s57.ts --input ./data/s57 --format json
`);
}

/**
 * 获取目录下的S57文件
 */
async function getS57Files(dir: string, recursive: boolean): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stats = await stat(fullPath);

            if (stats.isDirectory() && recursive) {
                const subFiles = await getS57Files(fullPath, recursive);
                files.push(...subFiles);
            } else if (stats.isFile() && isS57File(entry)) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`读取目录失败: ${dir}`, error);
    }

    return files;
}

/**
 * 检查是否为S57文件
 */
function isS57File(filename: string): boolean {
    const extensions = ['.000', '.s57', '.S57'];
    return extensions.some(ext => filename.toLowerCase().endsWith(ext.toLowerCase()));
}

/**
 * 验证S57文件
 */
async function validateS57File(filePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
        file: filePath,
        valid: true,
        errors: [],
        warnings: [],
        metadata: {
            size: 0,
            lastModified: new Date()
        }
    };

    try {
        // 获取文件基本信息
        const stats = await stat(filePath);
        result.metadata!.size = stats.size;
        result.metadata!.lastModified = stats.mtime;

        // 检查文件大小
        if (stats.size === 0) {
            result.errors.push('文件为空');
            result.valid = false;
        } else if (stats.size < 1024) {
            result.warnings.push('文件大小异常小');
        }

        // 这里可以添加更详细的S57格式验证
        // 由于需要专门的S57解析库，这里只做基本检查

        // 模拟一些基本的S57文件验证
        await validateS57Format(filePath, result);

    } catch (error) {
        result.errors.push(`文件访问错误: ${error}`);
        result.valid = false;
    }

    return result;
}

/**
 * 验证S57文件格式
 */
async function validateS57Format(filePath: string, result: ValidationResult): Promise<void> {
    try {
        // 读取文件头部分进行基本验证
        const file = Bun.file(filePath);
        const buffer = await file.arrayBuffer();
        const view = new Uint8Array(buffer.slice(0, 512)); // 读取前512字节

        // 检查S57文件特征
        // S57文件通常以特定的记录开始
        if (view.length < 24) {
            result.errors.push('文件头不完整');
            result.valid = false;
            return;
        }

        // 简单的文件头验证（这里是示例，实际需要根据S57标准实现）
        const header = new TextDecoder().decode(view.slice(0, 24));

        // 检查是否包含S57标识
        if (!header.includes('3LE1') && !header.includes('2LE1')) {
            result.warnings.push('未检测到标准S57文件头标识');
        }

        // 模拟对象计数
        result.metadata!.objectCount = Math.floor(buffer.byteLength / 1000); // 简单估算

    } catch (error) {
        result.errors.push(`格式验证失败: ${error}`);
        result.valid = false;
    }
}

/**
 * 输出验证结果
 */
function outputResults(results: ValidationResult[], format: 'json' | 'text'): void {
    if (format === 'json') {
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    // 文本格式输出
    const totalFiles = results.length;
    const validFiles = results.filter(r => r.valid).length;
    const invalidFiles = totalFiles - validFiles;

    console.log('\n=== S57文件验证报告 ===\n');
    console.log(`总文件数: ${totalFiles}`);
    console.log(`有效文件: ${validFiles}`);
    console.log(`无效文件: ${invalidFiles}`);
    console.log(`验证通过率: ${((validFiles / totalFiles) * 100).toFixed(2)}%\n`);

    // 输出详细结果
    for (const result of results) {
        console.log(`📁 ${result.file}`);
        console.log(`   状态: ${result.valid ? '✅ 有效' : '❌ 无效'}`);
        console.log(`   大小: ${(result.metadata!.size / 1024).toFixed(2)} KB`);

        if (result.metadata?.objectCount) {
            console.log(`   对象数量: ~${result.metadata.objectCount}`);
        }

        if (result.errors.length > 0) {
            console.log(`   错误:`);
            result.errors.forEach(error => console.log(`     ❌ ${error}`));
        }

        if (result.warnings.length > 0) {
            console.log(`   警告:`);
            result.warnings.forEach(warning => console.log(`     ⚠️  ${warning}`));
        }

        console.log('');
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🔍 S57数据验证工具\n');

    const options = parseArgs();

    console.log(`输入目录: ${options.inputDir}`);
    console.log(`递归搜索: ${options.recursive ? '是' : '否'}`);
    console.log(`输出格式: ${options.outputFormat}\n`);

    // 获取S57文件列表
    console.log('正在搜索S57文件...');
    const files = await getS57Files(options.inputDir, options.recursive);

    if (files.length === 0) {
        console.log('❌ 未找到任何S57文件');
        process.exit(1);
    }

    console.log(`找到 ${files.length} 个S57文件\n`);

    // 验证文件
    console.log('开始验证文件...');
    const results: ValidationResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(`\r验证进度: ${i + 1}/${files.length} (${((i + 1) / files.length * 100).toFixed(1)}%)`);

        const result = await validateS57File(file);
        results.push(result);
    }

    console.log('\n验证完成!\n');

    // 输出结果
    outputResults(results, options.outputFormat);

    // 设置退出码
    const hasErrors = results.some(r => !r.valid);
    process.exit(hasErrors ? 1 : 0);
}

// 运行主函数
if (import.meta.main) {
    main().catch(error => {
        console.error('验证过程发生错误:', error);
        process.exit(1);
    });
} 