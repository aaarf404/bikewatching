import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxlNDI4bWFvIiwiYSI6ImNtYXJqZDh6djA3b3cybW9sYTFiZnJ4eWUifQ.dXrAbKxfR0u6FcDooykzVQ';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

map.on('load', async () => {
    let jsonData;
    try {
  const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  jsonData = await d3.json(jsonurl);
  console.log('Loaded JSON Data:', jsonData);

  let stations = jsonData.data.stations;
  console.log('Stations Array:', stations);
    } catch (error) {
  console.error('Error loading JSON:', error);
    }

    // Add the GeoJSON data source for Boston bike lanes
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });
  
    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color':'#32D400',
        'line-width': 3,
        'line-opacity': 0.4,
      },
    });

    // Add Cambridge bike lane data source
    map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://data.cambridgema.gov/api/geospatial/ue5j-b2uc?method=export&format=GeoJSON',
  });
  
    map.addLayer({
    id: 'cambridge-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#007cbf',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });
  });
  