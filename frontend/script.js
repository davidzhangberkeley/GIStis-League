mapboxgl.accessToken = "pk.eyJ1IjoiZGF2aWR6aGFuZ2JlcmtlbGV5IiwiYSI6ImNtbTAwdXZoeDBjOGgza29ndHI5azh2eWUifQ.O9T-y7vy6IA4JWQTAKnpZA";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-122.4194, 37.7749],
  zoom: 11
});

map.on("load", () => {

  // Shops (points)
  map.addSource("shops", {
    type: "geojson",
    data: "data/sf_all_shop.geojson"
  });

  map.addLayer({
    id: "shops-layer",
    type: "circle",
    source: "shops",
    paint: {
      "circle-color": "#e55e5e",
      "circle-radius": 5,
      "circle-opacity": 0.9
    }
  });

  // Tracts (polygons)
  map.addSource("tracts", {
    type: "geojson",
    data: "data/SF_Berk_Oak_tracts.geojson"
  });

  map.addLayer({
    id: "tracts-fill",
    type: "fill",
    source: "tracts",
    paint: {
      "fill-color": "#088",
      "fill-opacity": 0.3
    }
  });

  map.addLayer({
    id: "tracts-outline",
    type: "line",
    source: "tracts",
    paint: {
      "line-color": "#044",
      "line-width": 2
    }
  });

});