import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const s57DataDir = "data/s57";
const outputDir = "dist";
const geojsonDir = path.join(outputDir, "geojson");
const mbtilesFile = path.join(outputDir, "s57.mbtiles");

function main() {
  console.log("Starting S57 to MBTiles conversion process...");

  // 1. Clean and prepare directories
  console.log("Preparing directories...");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(geojsonDir, { recursive: true });

  const s57Files = fs
    .readdirSync(s57DataDir)
    .filter((file) => file.endsWith(".000"));

  if (s57Files.length === 0) {
    console.log("No S57 files (.000) found in data/s57. Exiting.");
    return;
  }
  
  console.log(`Found ${s57Files.length} S57 file(s).`);
  
  const geojsonFiles = [];

  // 2. Convert S57 layers to GeoJSON
  for (const s57File of s57Files) {
    const s57FilePath = path.join(s57DataDir, s57File);
    console.log(`\nProcessing ${s57File}...`);

    try {
      const info = execSync(`ogrinfo -so ${s57FilePath}`).toString();
      const layerLines = info
        .split("\n")
        .filter((line) => line.match(/^\d+: /));
      const layers = layerLines.map((line) => line.split(" ")[1]);

      console.log(`Found layers: ${layers.join(", ")}`);

      for (const layer of layers) {
        // Use a unique name for each GeoJSON file to avoid conflicts
        const safeLayerName = `${path.basename(s57File, ".000")}_${layer}`;
        const geojsonFile = path.join(geojsonDir, `${safeLayerName}.geojson`);
        
        console.log(`  Converting layer '${layer}' to ${geojsonFile}`);
        
        const ogrCommand = [
          "ogr2ogr",
          "-f GeoJSON",
          // Handle multi-point features common in S57 (e.g., SOUNDG)
          "-oo SPLIT_MULTIPOINT=ON",
          geojsonFile,
          s57FilePath,
          layer,
        ].join(" ");
        
        execSync(ogrCommand, { stdio: "inherit" });
        
        // Add layer name as a property to each feature
        const content = JSON.parse(fs.readFileSync(geojsonFile, 'utf-8'));
        content.features.forEach(feature => {
            if (!feature.properties) {
                feature.properties = {};
            }
            // tippecanoe will use the name of the file as the layer name.
            // But we want to control the layer name inside the tileset.
            // So we will merge features from different files into one layer
            // in tippecanoe if they have the same name.
            // Here, we just add the original layer name for styling purposes.
            feature.properties.layer = layer;
        });
        fs.writeFileSync(geojsonFile, JSON.stringify(content));
        
        geojsonFiles.push({ path: geojsonFile, name: layer });
      }
    } catch (error) {
      console.error(`Error processing file ${s57File}:`, error);
    }
  }

  // 3. Generate MBTiles from GeoJSON files
  if (geojsonFiles.length > 0) {
    console.log("\nGenerating MBTiles using tippecanoe...");
    
    // Each GeoJSON file becomes a named layer in the tileset.
    const layerOptions = geojsonFiles
      .map(f => `-L ${f.name}:${f.path}`)
      .join(" ");

    const tippecanoeCommand = [
      "tippecanoe",
      "-o", mbtilesFile,
      "--force", // Overwrite if exists
      "--no-tile-compression", // Good for local serving
      "-zg", // Guess max zoom
      "--drop-densest-as-needed", // Drop features to reduce tile size at lower zooms
      ...geojsonFiles.map(f => f.path)
    ].join(" ");
    
    // Let's create a single layer in the tileset called 's57'
    // and put all features from all geojson files into it.
    // The layer name property will be used for styling.
    const allGeoJsonPaths = geojsonFiles.map(f => f.path).join(" ");
    const tippecanoeSingleLayerCommand = `tippecanoe -o ${mbtilesFile} --force -l s57 --no-tile-compression -zg --drop-densest-as-needed ${allGeoJsonPaths}`;

    try {
      execSync(tippecanoeSingleLayerCommand, { stdio: "inherit" });
      console.log(`\nSuccessfully created ${mbtilesFile}`);
    } catch (error) {
      console.error("Error running tippecanoe:", error);
    }

  } else {
    console.log("No GeoJSON files were generated, skipping MBTiles creation.");
  }

  // 4. Clean up temporary GeoJSON files
  console.log("\nCleaning up temporary GeoJSON files...");
  fs.rmSync(geojsonDir, { recursive: true, force: true });

  console.log("\nConversion process finished!");
}

main(); 