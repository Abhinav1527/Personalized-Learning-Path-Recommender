import pandas as pd

# Load datasets
train = pd.read_csv("data/train.csv")
test = pd.read_csv("data/test.csv")
sample = pd.read_csv("data/sample_submission.csv")

print("=" * 60)
print("TRAIN SHAPE :", train.shape)
print("TEST SHAPE  :", test.shape)
print("SAMPLE SHAPE:", sample.shape)
print("=" * 60)

print("\nTRAIN COLUMNS")
print(train.columns.tolist())

print("\nTEST COLUMNS")
print(test.columns.tolist())

print("\nSAMPLE SUBMISSION")
print(sample.head())

print("\nFIRST 5 ROWS OF TRAIN")
print(train.head())

print("\nDATA TYPES")
print(train.dtypes)

print("\nMISSING VALUES")
print(train.isnull().sum())

print("\nTARGET CANDIDATE")
print("Columns in sample submission:", sample.columns.tolist())
