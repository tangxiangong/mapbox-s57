import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import initSqlJs from 'sql.js';

async function startTileServer() {
  console.log('Loading sql.js...');
  const SQL = await initSqlJs({
    locateFile: file => path.join('node_modules', 'sql.js', 'dist', file)
  });

  console.log('Reading mbtiles file...');
  const fileBuffer = await fs.readFile('dist/s57.mbtiles');

  console.log('Loading database...');
  const db = new SQL.Database(fileBuffer);
  console.log('✅ MBTiles database loaded successfully.');

  const app = express();
  const port = 8080;

  // Enable CORS for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Tile endpoint: /{z}/{x}/{y}.pbf
  app.get('/:z/:x/:y.pbf', (req, res) => {
    const z = parseInt(req.params.z);
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);

    console.log(`➡️  Received tile request: z=${z}, x=${x}, y=${y}`);

    // Convert from slippy map Y to TMS Y coordinate
    const tmsY = (1 << z) - 1 - y;
    console.log(`    TMS Y coordinate: ${tmsY}`);
    console.log(`    Querying: zoom_level=${z}, tile_column=${x}, tile_row=${tmsY}`);

    try {
      // Use the tiles view which joins map and images tables
      const stmt = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?');
      stmt.bind([z, x, tmsY]);
      
      if (stmt.step()) {
        const result = stmt.get();
        const tileData = result[0]; // tile_data is the first (and only) column
        stmt.free();
        
        console.log(`    ✅ Tile found, size: ${tileData.length} bytes`);
        
        res.set({
          'Content-Type': 'application/x-protobuf',
          'Content-Encoding': 'gzip',
          'Cache-Control': 'public, max-age=86400'
        });
        
        res.send(Buffer.from(tileData));
      } else {
        stmt.free();
        console.log(`    ❌ Tile not found.`);
        res.status(404).send('Tile not found');
      }
    } catch (error) {
      console.error('    💥 Database error:', error);
      res.status(500).send('Database error');
    }
  });

  app.listen(port, () => {
    console.log(`✅ Tile server is running at http://localhost:${port}`);
  });
}

startTileServer().catch(console.error); 