import geopandas as gdp

# Load census tracts files from zip file
tracts = gdp.read_file('zip://tract.zip')

# Load SF, Oakland, Berkeley Land Use spatial data
sf_data = gdp.read_file('San_Francisco_Land_Use_2023.geojson')
oakland_data = gdp.read_file('Zoning_20260226.geojson')
berkeley_data = gdp.read_file('TaxParcel2017_20260226.geojson')

# Align the Coordinate Reference Systems
sf_data = sf_data.to_crs(tracts.crs)
oakland_data = oakland_data.to_crs(tracts.crs)
berkeley_data = berkeley_data.to_crs(tracts.crs)

def summarize_city_zoning(city_gdf, tracts_gdf, value_col, city_name):
    joined = gdp.sjoin(city_gdf, tracts_gdf[['GEOID', 'geometry']], how='inner', predicate='intersects')

    summary = joined.groupby('GEOID')[value_col].agg(lambda x: x.mode()[0] if not x.empty else None).reset_index()
    summary.rename(columns={value_col: f'{city_name}_Primary_Zoning'}, inplace=True)
    return summary
# Perform spatial join for each city
sf_summary = summarize_city_zoning(sf_data,tracts,'landuse','SF')
oakland_summary = summarize_city_zoning(oakland_data,tracts,'basezone', 'Oakland')
berkeley_summary = summarize_city_zoning(berkeley_data, tracts, 'use_code', 'Berkeley')

# Merge all results into main Tract dataframe
final_csv = tracts.drop(columns='geometry') # Remove map shapes for the CSV version
final_csv = final_csv.merge(sf_summary, on='GEOID', how='left')
final_csv = final_csv.merge(oakland_summary, on='GEOID', how='left')
final_csv = final_csv.merge(berkeley_summary, on='GEOID', how='left')

# Save to to CSV
final_csv.to_csv('Tract_Level_LandUse_Zoning_Combined.csv', index=False)





