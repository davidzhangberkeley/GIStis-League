mapboxgl.accessToken = ALEX_MAPBOX_TOKEN;

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
  // ---------------------------------
  // ACCESSIBLITY INDEX TRACTS
  // ----------------------------------
  map.addSource("bay-ai", {
    type: "geojson",
    data: "data/bay_AI_geo.geojson",
    generateId: true
  });

  map.addLayer({
    id: "bay-ai-fill",
    type: "fill",
    source: "bay-ai",
    paint: {
      "fill-color": [
      "interpolate",
      ["linear"],
      ["to-number", ["get", " Accessibility_Index"]],

      0, "#7f0000",
      20000, "#d7301f",
      40000, "#fc8d59",
      60000, "#fdbb84",
      80000, "#fee8c8",
      100000, "#d9f0a3",
      140000, "#78c679",
      180000, "#31a354",
      220000, "#006837"
    ],
    "fill-opacity": [
      "case",
    [
      "any",
      ["==", ["to-string", ["get", " Accessibility_Index"]], "NaN"],
      ["==", ["to-string", ["get", " Accessibility_Index"]], ""],
      ["==", ["get", " Accessibility_Index"], null]
    ],
      0,
      0.6
]
    }
  });

  map.addLayer({
    id: "bay-ai-outline",
    type: "line",
    source: "bay-ai",
    paint: {
      "line-color": "#111111",
      "line-width": 1.1,
      "line-opacity": 0.7
    }
  });

  map.addLayer({
    id: "bay-ai-hover",
    type: "line",
    source: "bay-ai",
    paint: {
      "line-color": "#000000",
      "line-width": 2.4
    },
    filter: ["==", ["id"], -1]
  });

  let hoveredAreaId = null;

  map.on("mousemove", "bay-ai-fill", (e) => {
    map.getCanvas().style.cursor = "pointer";
    if (!e.features || !e.features.length) return;

    const feature = e.features[0];
    const id = feature.id;
    if (id === undefined) return;

    hoveredAreaId = id;
    map.setFilter("bay-ai-hover", ["==", ["id"], hoveredAreaId]);
  });

  map.on("mouseleave", "bay-ai-fill", () => {
    map.getCanvas().style.cursor = "";
    hoveredAreaId = null;
    map.setFilter("bay-ai-hover", ["==", ["id"], -1]);
  });

  function areaPopupHTML(props) {
  const ai =
    props[" Accessibility_Index"] ??
    props.Accessibility_Index ??
    props.AI ??
    props.ai ??
    "N/A";

  const tract =
    props.NAMELSAD ??
    props.GEOID ??
    "Unknown area";

  const city =
    props.CDTFA_CITY ??
    props.CENSUS_PLA ??
    "";

  const county =
    props.CDTFA_COUN ??
    props.COUNTYFP ??
    "";

  const popDensity =
    props.acs_2024_tracts_berkeley_oakland_sf_density_pop_density ?? "";

  const medianIncome =
    props.acs_2024_tracts_berkeley_oakland_sf_density_median_income ??
    props.median_hh_ ??
    "";

  return `
    <div style="font-family: sans-serif; line-height: 1.35;">
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">
        ${tract}
      </div>
      ${city ? `<div style="font-size: 12px; margin-bottom: 4px;"><b>City:</b> ${city}</div>` : ""}
      ${county ? `<div style="font-size: 12px; margin-bottom: 4px;"><b>County:</b> ${county}</div>` : ""}
      <div style="font-size: 12px; margin-bottom: 4px;"><b>Accessibility Index:</b> ${Number(ai).toLocaleString()}</div>
      ${popDensity ? `<div style="font-size: 12px; margin-bottom: 4px;"><b>Population Density:</b> ${Number(popDensity).toLocaleString()}</div>` : ""}
      ${medianIncome ? `<div style="font-size: 12px;"><b>Median Income:</b> $${Number(medianIncome).toLocaleString()}</div>` : ""}
    </div>
  `;
  }

  map.on("click", "bay-ai-fill", (e) => {
    const feature = e.features && e.features[0];
    if (!feature) return;

    new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML(areaPopupHTML(feature.properties || {}))
      .addTo(map);
  });


  // --------------------
  // Berkeley
  // --------------------
  map.addSource("berkeley", {
    type: "geojson",
    data: "data/Berkeley1.geojson",
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
    data: "data/Oakland1.geojson",
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
    data: "data/SF1.geojson",
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