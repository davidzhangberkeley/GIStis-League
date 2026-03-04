mapboxgl.accessToken = "pk.eyJ1IjoiYWxvLTk3IiwiYSI6ImNtbTFqN3RuYjBhNzgycnB4YTQ0NGg1dmYifQ.gKIQJj5S9Pw1tgJUY_fb9g";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-122.2711, 37.8044], // Centered roughly between SF, Oakland, Berkeley
  zoom: 11
});

let hoveredId = null;

function addHover(sourceId, layerId) {
  map.addLayer({
    id: `${layerId}-hover`,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": 10,
      "circle-color": "#000000",
      "circle-opacity": 0.15
    },
    filter: ["==", ["id"], -1]
  });

  map.on("mousemove", layerId, (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features.length) return;
    const id = e.features[0].id;
    if (id === undefined) return;
    if (hoveredId !== null) map.setFilter(`${layerId}-hover`, ["==", ["id"], -1]);
    hoveredId = id;
    map.setFilter(`${layerId}-hover`, ["==", ["id"], hoveredId]);
  });

  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    hoveredId = null;
    map.setFilter(`${layerId}-hover`, ["==", ["id"], -1]);
  });
}

map.on("load", () => {

  // --------------------
  // Berkeley
  // --------------------
  map.addSource("berkeley", {
    type: "geojson",
    data: "alex_data/Berkeley1.geojson",
    generateId: true
  });

  map.addLayer({
    id: "berkeley-layer",
    type: "circle",
    source: "berkeley",
    paint: {
      "circle-radius": 6,
      "circle-color": "#3b82f6",
      "circle-opacity": 0.85,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff"
    }
  });

  // --------------------
  // Oakland
  // --------------------
  map.addSource("oakland", {
    type: "geojson",
    data: "alex_data/Oakland1.geojson",
    generateId: true
  });

  map.addLayer({
    id: "oakland-layer",
    type: "circle",
    source: "oakland",
    paint: {
      "circle-radius": 6,
      "circle-color": "#33a02c",
      "circle-opacity": 0.85,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff"
    }
  });

  // --------------------
  // San Francisco
  // --------------------
  map.addSource("sf", {
    type: "geojson",
    data: "alex_data/SF1.geojson",
    generateId: true
  });

  map.addLayer({
    id: "sf-layer",
    type: "circle",
    source: "sf",
    paint: {
      "circle-radius": 6,
      "circle-color": "#e31a1c",
      "circle-opacity": 0.85,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff"
    }
  });

  addHover("berkeley", "berkeley-layer");
  addHover("oakland", "oakland-layer");
  addHover("sf", "sf-layer"); 

  // Build popup HTML from your GeoJSON properties
  // Build popup HTML from the NEW GeoJSON properties
  function popupHTML(props) {
    const name = (props.company_business_name || props.company_bu) ?? "Unknown business";
    const addr = (props.formatted_address || props.formatted_) ?? `${props.address ?? ""}${props.city ? ", " + props.city : ""}`;
    const category = (props.business_category || props.business_c) ?? "";
    const industry = (props.industry_description|| props.industry_d) ?? "";
    const employees = (props.employee_count || props.employee_c) ?? "";
    const sqft = (props.square_footage || props.square_foo) ?? "";
    const sales = (props.sales_volume || props.sales_volu) ?? "";

    return `
      <div style="font-family: sans-serif; line-height: 1.35;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">
          ${name}
        </div>

        ${addr ? `<div style="font-size: 12px; margin-bottom: 6px;">${addr}</div>` : ""}

        ${(category || industry || employees || sqft || sales)
          ? `<hr style="margin:8px 0; border:none; border-top:1px solid #ddd;" />`
          : ""}

        ${category ? `<div style="font-size: 12px;"><b>Category:</b> ${category}</div>` : ""}
        ${industry ? `<div style="font-size: 12px;"><b>Industry:</b> ${industry}</div>` : ""}
        ${employees ? `<div style="font-size: 12px;"><b>Employees:</b> ${employees}</div>` : ""}
        ${sqft ? `<div style="font-size: 12px;"><b>Sq Ft:</b> ${sqft}</div>` : ""}
        ${sales ? `<div style="font-size: 12px;"><b>Sales Volume:</b> ${sales}</div>` : ""}
      </div>
    `;
  }

  // Enable click + hover behavior for all three layers
  ["berkeley-layer", "oakland-layer", "sf-layer"].forEach((layerId) => {
    map.on("click", layerId, (e) => {
      const feature = e.features && e.features[0];
      if (!feature) return;

      const coords = feature.geometry.coordinates.slice(); // [lon, lat]
      const props = feature.properties || {};

      // Fix wraparound (if map is zoomed out and world repeats)
      while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
        coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
      }

      new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(coords)
        .setHTML(popupHTML(props))
        .addTo(map);
    });

    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  });

});