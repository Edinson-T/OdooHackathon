import L from "leaflet";

/** The area the illustrated field map covers. */
export const fieldBounds = L.latLngBounds([50.82, 4.1], [50.94, 4.7]);

/**
 * The same background for every map: the illustrated field map by default, with the
 * street map as an option. The view is kept inside the drawing and can't zoom out past
 * it, so the picture always fills the frame.
 */
export function addBaseLayers(map: L.Map) {
  const land = L.imageOverlay("./landscape.png", fieldBounds, {
    attribution: "Green Assets · illustrated zone map",
  }).addTo(map);
  const street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    className: "quiet-tiles",
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  street.once("tileerror", () => {
    map.removeLayer(street);
    land.addTo(map);
  });
  L.control.layers({ "Field map": land, "Street map": street }, {}, { position: "topright" }).addTo(map);
  map.options.maxBoundsViscosity = 1;
  map.setMaxBounds(fieldBounds);
  const fill = () => {
    const smallest = map.getBoundsZoom(fieldBounds, true);
    map.setMinZoom(smallest);
    if (map.getZoom() < smallest) map.setZoom(smallest);
  };
  fill();
  map.on("resize", fill);
}
