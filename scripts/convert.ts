import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const s57DataDir = "data/s57";
const outputDir = "dist";
const mbtilesDir = path.join(outputDir, "mbtiles");
const geojsonDir = path.join(outputDir, "geojson");

interface ConversionOptions {
  input: string;
  output: string;
  format: 'mbtiles' | 'mvt';
  minZoom?: number;
  maxZoom?: number;
  keepGeojson?: boolean;
}

function parseArgs(): ConversionOptions {
  const args = process.argv.slice(2);
  const options: ConversionOptions = {
    input: s57DataDir,
    output: outputDir,
    format: 'mbtiles'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'mbtiles' | 'mvt';
        break;
      case '--min-zoom':
        options.minZoom = parseInt(args[++i]);
        break;
      case '--max-zoom':
        options.maxZoom = parseInt(args[++i]);
        break;
      case '--keep-geojson':
        options.keepGeojson = true;
        break;
    }
  }

  return options;
}

function convertS57File(s57FilePath: string, outputOptions: ConversionOptions): void {
  const s57FileName = path.basename(s57FilePath, ".000");
  const chartGeojsonDir = path.join(geojsonDir, s57FileName);
  const chartMbtilesFile = path.join(mbtilesDir, `${s57FileName}.mbtiles`);

  console.log(`\n🗺️  处理海图: ${s57FileName}`);
  console.log(`   输入文件: ${s57FilePath}`);
  console.log(`   输出文件: ${chartMbtilesFile}`);

  // 创建临时GeoJSON目录
  fs.mkdirSync(chartGeojsonDir, { recursive: true });

  try {
    // 获取S57文件中的所有图层
    const info = execSync(`ogrinfo -so "${s57FilePath}"`).toString();
    const layerLines = info
      .split("\n")
      .filter((line) => line.match(/^\d+: /));
    const layers = layerLines.map((line) => line.split(" ")[1]);

    console.log(`   发现图层 (${layers.length}个): ${layers.slice(0, 5).join(", ")}${layers.length > 5 ? '...' : ''}`);

    const geojsonFiles: string[] = [];

    // 转换每个图层到GeoJSON
    for (const layer of layers) {
      const geojsonFile = path.join(chartGeojsonDir, `${layer}.geojson`);

      console.log(`     转换图层 '${layer}'`);

      try {
        const ogrCommand = [
          "ogr2ogr",
          "-f GeoJSON",
          "-oo SPLIT_MULTIPOINT=ON", // 处理多点要素
          "-oo LIST_ALL_TABLES=YES",  // 列出所有表
          `"${geojsonFile}"`,
          `"${s57FilePath}"`,
          layer,
        ].join(" ");

        execSync(ogrCommand, { stdio: "pipe" });

        // 检查生成的GeoJSON文件是否包含要素
        if (fs.existsSync(geojsonFile)) {
          const content = JSON.parse(fs.readFileSync(geojsonFile, 'utf-8'));
          if (content.features && content.features.length > 0) {
            // 为每个要素添加图层信息
            content.features.forEach((feature: any) => {
              if (!feature.properties) {
                feature.properties = {};
              }
              feature.properties.layer = layer;
              feature.properties.chart = s57FileName;
            });

            fs.writeFileSync(geojsonFile, JSON.stringify(content));
            geojsonFiles.push(geojsonFile);
            console.log(`       ✅ ${content.features.length} 个要素`);
          } else {
            // 删除空文件
            fs.unlinkSync(geojsonFile);
            console.log(`       ⚠️  空图层，已跳过`);
          }
        }
      } catch (error) {
        console.log(`       ❌ 转换失败: ${error}`);
      }
    }

    if (geojsonFiles.length === 0) {
      console.log(`   ⚠️  没有有效的图层数据，跳过瓦片生成`);
      return;
    }

    // 生成MBTiles
    console.log(`   📦 生成矢量瓦片 (${geojsonFiles.length}个图层)`);

    const tippecanoeArgs = [
      "tippecanoe",
      "-o", `"${chartMbtilesFile}"`,
      "--force", // 覆盖已存在的文件
      "--no-tile-compression", // 便于本地服务
      "-z", (outputOptions.maxZoom || 14).toString(), // 最大缩放级别
      "-Z", (outputOptions.minZoom || 0).toString(),  // 最小缩放级别
      "--drop-densest-as-needed", // 在低缩放级别丢弃密集要素
      "--extend-zooms-if-still-dropping", // 如果仍在丢弃，则扩展缩放
      "-l", s57FileName, // 使用海图名作为图层名
      ...geojsonFiles.map(f => `"${f}"`)
    ];

    const tippecanoeCommand = tippecanoeArgs.join(" ");

    try {
      execSync(tippecanoeCommand, { stdio: "pipe" });

      // 检查生成的文件大小
      const stats = fs.statSync(chartMbtilesFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   ✅ 成功生成: ${sizeMB}MB`);

    } catch (error) {
      console.error(`   ❌ Tippecanoe错误:`, error);
    }

  } catch (error) {
    console.error(`   💥 处理文件错误:`, error);
  } finally {
    // 清理临时GeoJSON文件（除非指定保留）
    if (!outputOptions.keepGeojson && fs.existsSync(chartGeojsonDir)) {
      fs.rmSync(chartGeojsonDir, { recursive: true, force: true });
    }
  }
}

function main() {
  const options = parseArgs();

  console.log("🚀 S57海图转换工具");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📁 输入目录: ${options.input}`);
  console.log(`📁 输出目录: ${options.output}`);
  console.log(`📦 输出格式: ${options.format}`);
  console.log(`🔍 缩放级别: ${options.minZoom || 0} - ${options.maxZoom || 14}`);

  // 准备输出目录
  if (fs.existsSync(options.output)) {
    fs.rmSync(options.output, { recursive: true, force: true });
  }
  fs.mkdirSync(options.output, { recursive: true });
  fs.mkdirSync(mbtilesDir, { recursive: true });
  fs.mkdirSync(geojsonDir, { recursive: true });

  // 查找S57文件
  const s57Files = fs
    .readdirSync(options.input)
    .filter((file) => file.endsWith(".000"))
    .map(file => path.join(options.input, file));

  if (s57Files.length === 0) {
    console.log("❌ 在指定目录中未找到S57文件 (.000)");
    return;
  }

  console.log(`\n📊 发现 ${s57Files.length} 个S57海图文件:`);
  s57Files.forEach((file, index) => {
    console.log(`   ${index + 1}. ${path.basename(file)}`);
  });

  // 转换每个S57文件
  console.log(`\n🔄 开始转换处理...`);
  let successCount = 0;

  for (const s57File of s57Files) {
    try {
      convertS57File(s57File, options);
      successCount++;
    } catch (error) {
      console.error(`💥 处理 ${path.basename(s57File)} 时发生错误:`, error);
    }
  }

  // 清理临时目录
  if (!options.keepGeojson && fs.existsSync(geojsonDir)) {
    fs.rmSync(geojsonDir, { recursive: true, force: true });
  }

  console.log(`\n✅ 转换完成!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📈 成功处理: ${successCount}/${s57Files.length} 个海图`);

  if (successCount > 0) {
    console.log(`📂 输出位置: ${path.resolve(mbtilesDir)}`);

    // 显示生成的文件
    const mbtilesFiles = fs.readdirSync(mbtilesDir).filter(f => f.endsWith('.mbtiles'));
    console.log(`\n📦 生成的MBTiles文件:`);
    mbtilesFiles.forEach(file => {
      const filePath = path.join(mbtilesDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   • ${file} (${sizeMB}MB)`);
    });
  }

  console.log(`\n💡 使用方法:`);
  console.log(`   bun run serve:tiles  # 启动瓦片服务器`);
  console.log(`   然后访问 http://localhost:5173 查看渲染效果`);
}

if (require.main === module) {
  main();
}

export { convertS57File, ConversionOptions }; 