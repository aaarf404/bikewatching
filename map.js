import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxlNDI4bWFvIiwiYSI6ImNtYXJqZDh6djA3b3cybW9sYTFiZnJ4eWUifQ.dXrAbKxfR0u6FcDooykzVQ';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// Helper function to convert lon/lat to projected coordinates
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  const tripsURL = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
  const trips = await d3.csv(tripsURL);
  const departures = d3.rollup(
    trips,
    v => v.length,
    d => d.start_station_id
  );
  
  const arrivals = d3.rollup(
    trips,
    v => v.length,
    d => d.end_station_id
  );
  stations = stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
  console.log('Enriched Stations:', stations);

  const radiusScale = d3.scaleSqrt()
  .domain([0, d3.max(stations, d => d.totalTraffic)])
  .range([0, 25]);
  
  let stations;
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    console.log('Loaded JSON Data:', jsonData);
    stations = jsonData.data.stations;
    console.log('Stations Array:', stations);
  } catch (error) {
    console.error('Error loading JSON:', error);
    return; // stop further execution if fetch fails
  }

  // Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 3,
      'line-opacity': 0.4,
    },
  });

  // Cambridge bike lanes
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

  // Add stations to SVG overlay
  const svg = d3.select('#map').select('svg');

  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('fill', 'steelblue')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6);
    circles.each(function (d) {
        d3.select(this)
          .append('title')
          .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
      });
      

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }

  updatePositions();

  // Update circle positions when map moves or zooms
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});
