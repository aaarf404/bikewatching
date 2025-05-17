import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxlNDI4bWFvIiwiYSI6ImNtYXJqZDh6djA3b3cybW9sYTFiZnJ4eWUifQ.dXrAbKxfR0u6FcDooykzVQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// 🧠 Global buckets
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

let timeFilter = -1;
let svg, circles, radiusScale, stations;

map.on('load', async () => {
  const allTrips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);

      const startMin = minutesSinceMidnight(trip.started_at);
      const endMin = minutesSinceMidnight(trip.ended_at);

      departuresByMinute[startMin].push(trip);
      arrivalsByMinute[endMin].push(trip);
      return trip;
    }
  );

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    stations = jsonData.data.stations;

    const enrichedStations = computeStationTraffic(stations);

    radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(enrichedStations, (d) => d.totalTraffic)])
      .range([0, 25]);

    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://opendata.arcgis.com/api/v3/datasets/4f97c1d6e2da489b9b0be2e750dfb973_0/downloads/data?format=geojson&spatialRefId=4326',
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

    svg = d3.select('#map').select('svg');

    circles = svg.selectAll('circle')
      .data(enrichedStations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6)
      .each(function (d) {
        d3.select(this)
          .append('title')
          .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
      });

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }

    function updateScatterPlot(timeFilter) {
      const filteredStations = computeStationTraffic(stations, timeFilter);

      timeFilter === -1
        ? radiusScale.range([0, 25])
        : radiusScale.range([3, 50]);

      circles
        .data(filteredStations, (d) => d.short_name)
        .join('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic));
    }

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function updateTimeDisplay() {
      timeFilter = Number(timeSlider.value);
      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }
      updateScatterPlot(timeFilter);
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();

    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
  } catch (error) {
    console.error('Error loading station JSON:', error);
  }
});
