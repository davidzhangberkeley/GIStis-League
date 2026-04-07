import pandas as pd
import geopandas as gpd

# Load CSV
df = pd.read_csv("old_data/cleaned_dataset.csv")

# Fix GEOID format
df["GEOID"] = df["GEOID"].astype(str).str.replace(".0", "", regex=False).str.zfill(11)

# Load GPKG (this is the key change)
gdf = gpd.read_file("old_data/tract_data_0331.gpkg")

# Check column names
print(gdf.columns)

gdf["GEOID"] = gdf["GEOID"].astype(str).str.zfill(11)

# Merge
merged = gdf.merge(df, on="GEOID", how="left")

# Save as GeoJSON for Mapbox
merged.to_file("data/tracts_merged.geojson", driver="GeoJSON")

print("Merge complete!")