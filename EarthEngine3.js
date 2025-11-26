// -----------------------------
// 1. Define ROI (Pune example)
// -----------------------------
var roiRect = ee.Geometry.Rectangle([73.7, 18.4, 74.0, 18.7]);
Map.centerObject(roiRect, 11);
Map.addLayer(roiRect, {color: 'blue'}, 'Pune ROI');

var name = "Pune_StudyArea_2016";

// -----------------------------
// 2. Sentinel-2 Surface Reflectance (RGB + NIR + SWIR1 + SWIR2)
// -----------------------------
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(roiRect)
  .filterDate('2016-01-01', '2016-12-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .select(['B2','B3','B4','B8','B11','B12']);

print('Sentinel-2 image count:', s2.size());

// --- Check if Sentinel-2 has valid data ---
if (s2.size().eq(0).getInfo()) {
  throw '❌ Error: Sentinel-2 returned no images for this region/date range!';
}

var s2_img = s2.median().clip(roiRect).toFloat();

// -----------------------------
// 3. Landsat-8 Thermal (Band 10)
// -----------------------------
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
  .filterBounds(roiRect)
  .filterDate('2016-01-01', '2016-12-31')
  .select(['B10'])
  .median()
  .rename(['Thermal'])
  .clip(roiRect)
  .toFloat();

if (l8.bandNames().size().eq(0).getInfo()) {
  throw '❌ Error: Landsat-8 returned no images for this region/date range!';
}

// -----------------------------
// 4. DEM (SRTM)
// -----------------------------
var dem = ee.Image('USGS/SRTMGL1_003')
  .select('elevation')
  .rename(['DEM'])
  .clip(roiRect)
  .toFloat();

// -----------------------------
// 5. Combine All 8 Bands
// -----------------------------
var combined = s2_img.addBands(l8).addBands(dem);

// Rename all bands clearly
combined = combined.rename([
  'Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'Thermal', 'DEM'
]);

print('✅ Final combined bands:', combined.bandNames());

// -----------------------------
// 6. Visualization (optional)
// -----------------------------
Map.addLayer(combined.select(['Red','Green','Blue']), {min:0, max:3000}, 'RGB');
Map.addLayer(combined.select('Thermal'), {min:290, max:315}, 'Thermal');
Map.addLayer(combined.select('DEM'), {min:0, max:3000}, 'DEM');

// -----------------------------
// 7. Export to Google Drive
// -----------------------------
Export.image.toDrive({
  image: combined,
  description: name,
  folder: 'Satellite_Exports',
  fileNamePrefix: name,
  region: roiRect,
  scale: 10,                 // ✅ High clarity, aligned across all bands
  crs: 'EPSG:4326',
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});
