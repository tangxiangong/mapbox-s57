import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";
import { getToken } from "./token.ts";

mapboxgl.accessToken = getToken();

// 创建地图实例
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12", // 地图样式
  center: [114.31, 30.57], // 地图中心点
  projection: "globe", // 地图投影
  zoom: 12, // 地图缩放级别
});