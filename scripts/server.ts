import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import initSqlJs from 'sql.js';

interface MBTilesDatabase {
  name: string;
  db: any;
  filePath: string;
}

async function loadMBTilesDatabases(): Promise<MBTilesDatabase[]> {
  console.log('🔍 扫描MBTiles文件...');

  const mbtilesDir = 'dist/mbtiles';
  const databases: MBTilesDatabase[] = [];

  // 检查目录是否存在
  try {
    await fs.access(mbtilesDir);
  } catch {
    console.log('⚠️  MBTiles目录不存在，回退到单文件模式');
    // 回退到原来的单文件模式
    try {
      await fs.access('dist/s57.mbtiles');
      const SQL = await initSqlJs({
        locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
      });
      const fileBuffer = await fs.readFile('dist/s57.mbtiles');
      const db = new SQL.Database(fileBuffer);
      databases.push({
        name: 's57',
        db: db,
        filePath: 'dist/s57.mbtiles'
      });
      console.log('✅ 加载了单个MBTiles文件: s57.mbtiles');
    } catch {
      console.log('❌ 未找到任何MBTiles文件');
    }
    return databases;
  }

  // 扫描MBTiles目录
  const files = await fs.readdir(mbtilesDir);
  const mbtilesFiles = files.filter(file => file.endsWith('.mbtiles'));

  if (mbtilesFiles.length === 0) {
    console.log('❌ 在mbtiles目录中未找到.mbtiles文件');
    return databases;
  }

  const SQL = await initSqlJs({
    locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
  });

  for (const file of mbtilesFiles) {
    try {
      const filePath = path.join(mbtilesDir, file);
      const chartName = path.basename(file, '.mbtiles');

      console.log(`📂 加载海图数据库: ${chartName}`);

      const fileBuffer = await fs.readFile(filePath);
      const db = new SQL.Database(fileBuffer);

      // 验证数据库结构
      try {
        const metadata = db.exec('SELECT name, value FROM metadata');
        const tileCountResult = db.exec('SELECT COUNT(*) as count FROM tiles');
        const tileCount = tileCountResult[0]?.values[0]?.[0] || 0;

        console.log(`   ✅ ${chartName}: ${tileCount} 个瓦片`);

        databases.push({
          name: chartName,
          db: db,
          filePath: filePath
        });
      } catch (dbError) {
        console.log(`   ❌ ${chartName}: 数据库格式错误 - ${dbError}`);
        console.log(`   📋 尝试检查表结构...`);
        try {
          const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
          if (tablesResult.length > 0 && tablesResult[0].values) {
            const tables = tablesResult[0].values.map(row => row[0]);
            console.log(`   📊 可用表: ${tables.join(', ')}`);
          }
        } catch (e) {
          console.log(`   💥 无法读取数据库: ${e}`);
        }
      }

    } catch (error) {
      console.log(`   💥 加载 ${file} 失败:`, error);
    }
  }

  console.log(`\n🎯 成功加载 ${databases.length} 个海图数据库`);
  return databases;
}

async function startTileServer() {
  console.log('🚀 启动S57瓦片服务器');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const databases = await loadMBTilesDatabases();

  if (databases.length === 0) {
    console.log('❌ 没有可用的MBTiles数据库，请先运行数据转换');
    process.exit(1);
  }

  const app = express();
  const port = 8080;

  // Enable CORS for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      charts: databases.map(db => ({
        name: db.name,
        filePath: db.filePath
      }))
    });
  });

  // 列出所有可用的海图
  app.get('/charts', (req, res) => {
    const chartList = databases.map(db => {
      try {
        const metadataResult = db.db.exec('SELECT name, value FROM metadata');
        const metadataObj: any = {};
        if (metadataResult.length > 0 && metadataResult[0].values) {
          metadataResult[0].values.forEach((row: any[]) => {
            metadataObj[row[0]] = row[1];
          });
        }

        const tileCountResult = db.db.exec('SELECT COUNT(*) as count FROM tiles');
        const tileCount = tileCountResult[0]?.values[0]?.[0] || 0;

        const zoomLevelsResult = db.db.exec('SELECT DISTINCT zoom_level FROM tiles ORDER BY zoom_level');
        const zoomLevels = zoomLevelsResult[0]?.values?.map((row: any[]) => row[0]) || [];

        return {
          name: db.name,
          metadata: metadataObj,
          tileCount: tileCount,
          zoomLevels: zoomLevels
        };
      } catch (error) {
        return {
          name: db.name,
          error: '无法读取元数据'
        };
      }
    });

    res.json(chartList);
  });

  // 通用瓦片端点: /{chartName}/{z}/{x}/{y}.pbf
  app.get('/:chartName/:z/:x/:y.pbf', (req, res) => {
    const chartName = req.params.chartName;
    const z = parseInt(req.params.z);
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);

    // 查找对应的数据库
    const database = databases.find(db => db.name === chartName);
    if (!database) {
      console.log(`❌ 未找到海图: ${chartName}`);
      res.status(404).send(`Chart '${chartName}' not found`);
      return;
    }

    console.log(`🗺️  瓦片请求: ${chartName} z=${z}, x=${x}, y=${y}`);

    // Convert from slippy map Y to TMS Y coordinate
    const tmsY = (1 << z) - 1 - y;

    try {
      const result = database.db.exec('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?', [z, x, tmsY]);

      if (result.length > 0 && result[0].values.length > 0) {
        const tileData = result[0].values[0][0];

        console.log(`   ✅ 瓦片找到: ${tileData.length} 字节`);

        res.set({
          'Content-Type': 'application/x-protobuf',
          'Content-Encoding': 'gzip',
          'Cache-Control': 'public, max-age=86400'
        });

        res.send(Buffer.from(tileData));
      } else {
        console.log(`   ⚠️  瓦片未找到`);
        res.status(404).send('Tile not found');
      }
    } catch (error) {
      console.error(`   💥 数据库错误:`, error);
      res.status(500).send('Database error');
    }
  });

  // 兼容原有的单文件模式端点: /{z}/{x}/{y}.pbf （使用第一个数据库）
  app.get('/:z/:x/:y.pbf', (req, res) => {
    if (databases.length === 0) {
      res.status(404).send('No charts available');
      return;
    }

    // 重定向到第一个海图的端点
    const firstChart = databases[0].name;
    const z = req.params.z;
    const x = req.params.x;
    const y = req.params.y;

    console.log(`🔄 重定向到: ${firstChart}/${z}/${x}/${y}.pbf`);
    req.url = `/${firstChart}/${z}/${x}/${y}.pbf`;
    req.params.chartName = firstChart;

    // 使用相同的处理逻辑
    app._router.handle(req, res);
  });

  app.listen(port, () => {
    console.log(`✅ 瓦片服务器运行在: http://localhost:${port}`);
    console.log(`\n📋 可用端点:`);
    console.log(`   GET /health                     - 服务器状态`);
    console.log(`   GET /charts                     - 海图列表`);
    console.log(`   GET /{chartName}/{z}/{x}/{y}.pbf - 海图瓦片`);
    console.log(`   GET /{z}/{x}/{y}.pbf            - 默认瓦片 (兼容模式)`);

    console.log(`\n🗺️  可用海图:`);
    databases.forEach(db => {
      console.log(`   • ${db.name} - http://localhost:${port}/${db.name}/{z}/{x}/{y}.pbf`);
    });

    console.log(`\n💡 测试命令:`);
    console.log(`   curl http://localhost:${port}/health`);
    console.log(`   curl http://localhost:${port}/charts`);
    if (databases.length > 0) {
      console.log(`   curl http://localhost:${port}/${databases[0].name}/0/0/0.pbf`);
    }
  });
}

startTileServer().catch(console.error); 