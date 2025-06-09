import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

// Define the style inline to avoid loading issues
const s57Style: mapboxgl.StyleSpecification = {
  "version": 8,
  "name": "S-57 Chart",
  "sources": {
    "s57-tiles": {
      "type": "vector",
      "tiles": ["http://localhost:8080/{z}/{x}/{y}.pbf"],
      "maxzoom": 14
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "rgb(192, 213, 228)"
      }
    },
    {
      "id": "DEPARE-fill",
      "type": "fill",
      "source": "s57-tiles",
      "source-layer": "s57",
      "filter": ["==", "layer", "DEPARE"],
      "paint": {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "DRVAL1"],
          0, "rgb(202, 223, 238)",
          5, "rgb(192, 213, 228)",
          10, "rgb(182, 203, 218)",
          20, "rgb(172, 193, 208)"
        ]
      }
    },
    {
      "id": "LNDARE-fill",
      "type": "fill",
      "source": "s57-tiles",
      "source-layer": "s57",
      "filter": ["==", "layer", "LNDARE"],
      "paint": {
        "fill-color": "rgb(242, 239, 233)"
      }
    },
    {
      "id": "COALNE-line",
      "type": "line",
      "source": "s57-tiles",
      "source-layer": "s57",
      "filter": ["==", "layer", "COALNE"],
      "layout": {
        "line-join": "round",
        "line-cap": "round"
      },
      "paint": {
        "line-color": "#5a788a",
        "line-width": 1
      }
    },
    {
      "id": "SOUNDG-text",
      "type": "symbol",
      "source": "s57-tiles",
      "source-layer": "s57",
      "filter": ["==", "layer", "SOUNDG"],
      "minzoom": 12,
      "layout": {
        "text-field": ["to-string", ["get", "VALSOU"]],
        "text-font": ["Open Sans Regular"],
        "text-size": 10,
        "text-allow-overlap": false
      },
      "paint": {
        "text-color": "#5a788a",
        "text-halo-color": "rgb(192, 213, 228)",
        "text-halo-width": 1
      }
    }
  ]
};

const map = new mapboxgl.Map({
  container: "app",
  style: s57Style,
  center: [111.708984, 21.698242],
  zoom: 11
});

map.on('load', () => {
  console.log('Map loaded successfully!');
});

map.on('error', (e) => {
  console.error('Map error:', e);
});

// Add some debugging
map.on('sourcedata', (e) => {
  if (e.sourceId === 's57-tiles' && e.isSourceLoaded) {
    console.log('S57 tiles source loaded');
  }
});

// The map will now automatically load tiles from the tile server