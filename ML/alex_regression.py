import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

ai = pd.read_csv("C://Users//alexa//OneDrive//Desktop//gistis//GIStis-League//Data//Bay_AI.csv")
age = pd.read_csv("C://Users//alexa//OneDrive//Desktop//gistis//GIStis-League//Data//city_age_data.csv")
edu = pd.read_csv("C://Users//alexa//OneDrive//Desktop//gistis//GIStis-League//Data//city_education_data.csv")


ai = ai.drop_duplicates(subset=['GEOID'])
age = age.drop_duplicates(subset=['GEOID'])
edu = edu.drop_duplicates(subset=['GEOID'])

ai = ai.dropna(subset=['acs_2024_tracts_berkeley_oakland_sf_density_total_pop'])

together = pd.merge(ai, age, how='inner', on='GEOID')
together = pd.merge(together, edu, how='inner', on='GEOID')

print(together.shape[0])