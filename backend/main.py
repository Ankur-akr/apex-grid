
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import io, os, tempfile, json
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

app = FastAPI(title="APEX GRID API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "df_f1.csv")
TARGET = "podium"

def read_any(content: bytes, filename: str) -> pd.DataFrame:
    try:
        if filename.lower().endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(content))
        return pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not read dataset: {e}")

def clean_frame(df: pd.DataFrame):
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df

def model_factory(name):
    name = name.lower()
    if name == "linear":
        return LinearRegression()
    if name == "mlp":
        return MLPRegressor(hidden_layer_sizes=(96, 48), activation="relu",
                            learning_rate_init=0.001, max_iter=350, random_state=42,
                            early_stopping=True)
    if name == "xgboost":
        return XGBRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.035,
            subsample=0.85, colsample_bytree=0.85, objective="reg:squarederror",
            random_state=42, n_jobs=2
        )
    raise HTTPException(400, "Unknown model. Use linear, mlp or xgboost.")

def build_pipeline(df, model_name):
    drop = [c for c in ["podium", "Predicted", "Predicted Position"] if c in df.columns]
    X = df.drop(columns=drop, errors="ignore")
    # Target-like outcome columns are excluded from inference if present.
    for c in ["finish_position", "position", "result", "points_scored"]:
        if c in X.columns:
            X = X.drop(columns=[c])

    numeric = X.select_dtypes(include=[np.number, "bool"]).columns.tolist()
    categorical = [c for c in X.columns if c not in numeric]

    pre = ColumnTransformer([
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median")),
                          ("scale", StandardScaler())]), numeric),
        ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")),
                          ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical)
    ])
    return X, Pipeline([("pre", pre), ("model", model_factory(model_name))])

def f1_points(position: int, sprint=False):
    race = {1:25,2:18,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1}
    sprint_points = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:1}
    return (sprint_points if sprint else race).get(int(position), 0)

def predict_frame(train_df, input_df, model_name):
    train_df = clean_frame(train_df)
    input_df = clean_frame(input_df)
    if TARGET not in train_df.columns:
        raise HTTPException(400, "Training dataset must contain a 'podium' target column.")

    # Train using the same feature columns available at inference.
    train_X = train_df.drop(columns=[TARGET])
    input_X = input_df.copy()
    input_X = input_X.drop(columns=["podium"], errors="ignore")
    for c in ["finish_position", "position", "result", "points_scored"]:
        train_X = train_X.drop(columns=[c], errors="ignore")
        input_X = input_X.drop(columns=[c], errors="ignore")

    # Align columns. Missing input columns are filled with NaN; extras are ignored.
    for c in train_X.columns:
        if c not in input_X.columns:
            input_X[c] = np.nan
    input_X = input_X[train_X.columns]

    y = train_df[TARGET].astype(float)
    numeric = train_X.select_dtypes(include=[np.number, "bool"]).columns.tolist()
    categorical = [c for c in train_X.columns if c not in numeric]
    pre = ColumnTransformer([
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median")),
                          ("scale", StandardScaler())]), numeric),
        ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")),
                          ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical)
    ])
    pipe = Pipeline([("pre", pre), ("model", model_factory(model_name))])
    pipe.fit(train_X, y)
    pred = pipe.predict(input_X)
    # A finish position is ordinal and must be clipped to a sensible range.
    pred = np.clip(pred, 1, 20)

    out = input_df.copy()
    out["Predicted"] = np.round(pred, 3)
    # Rank within each race so the predicted classification is unique.
    if "round" in out.columns:
        out["Predicted Position"] = out.groupby("round")["Predicted"].rank(method="first", ascending=True).astype(int)
    else:
        out["Predicted Position"] = pd.Series(pred).rank(method="first", ascending=True).astype(int)
    out["Predicted Points"] = out["Predicted Position"].map(f1_points)
    return out, pipe

@app.get("/api/health")
def health():
    return {"status": "ok", "dataset": os.path.basename(DATASET)}

@app.get("/api/demo")
def demo():
    df = pd.read_csv(DATASET)
    return {
        "rows": len(df),
        "columns": len(df.columns),
        "seasons": sorted(df["season"].dropna().unique().astype(int).tolist()),
        "drivers": int(df["driver"].nunique()) if "driver" in df else 0,
        "constructors": int(df["constructor"].nunique()) if "constructor" in df else 0,
        "rounds": int(df["round"].nunique()) if "round" in df else 0,
        "features": df.columns.tolist()
    }

@app.post("/api/validate")
async def validate(file: UploadFile = File(...)):
    content = await file.read()
    df = clean_frame(read_any(content, file.filename))
    required = ["season", "round", "driver", "constructor"]
    missing = [c for c in required if c not in df.columns]
    return {
        "valid": not missing,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(df.columns),
        "missing_required": missing,
        "seasons": sorted(df["season"].dropna().unique().astype(int).tolist()) if "season" in df else [],
        "rounds": sorted(df["round"].dropna().unique().astype(int).tolist()) if "round" in df else [],
        "drivers": int(df["driver"].nunique()) if "driver" in df else 0,
        "constructors": int(df["constructor"].nunique()) if "constructor" in df else 0,
        "missing_values": int(df.isna().sum().sum())
    }

@app.post("/api/predict")
async def predict(file: UploadFile = File(...), model: str = "xgboost"):
    content = await file.read()
    input_df = clean_frame(read_any(content, file.filename))
    train_df = pd.read_csv(DATASET)
    result, _ = predict_frame(train_df, input_df, model)
    cols = [c for c in ["season","round","driver","constructor","grid","Predicted","Predicted Position","Predicted Points"] if c in result.columns]
    return {"model": model, "rows": len(result), "predictions": result[cols].to_dict(orient="records")}

@app.post("/api/simulate")
async def simulate(file: UploadFile = File(...), model: str = "xgboost"):
    content = await file.read()
    input_df = clean_frame(read_any(content, file.filename))
    train_df = pd.read_csv(DATASET)
    result, _ = predict_frame(train_df, input_df, model)
    if "round" not in result.columns or "driver" not in result.columns:
        raise HTTPException(400, "Simulation requires round and driver columns.")

    result["Predicted Points"] = result["Predicted Position"].map(f1_points)
    standings = (result.groupby(["driver","constructor"], as_index=False)["Predicted Points"]
                 .sum().sort_values("Predicted Points", ascending=False))
    standings["Position"] = np.arange(1, len(standings)+1)
    constructors = (standings.groupby("constructor", as_index=False)["Predicted Points"]
                    .sum().sort_values("Predicted Points", ascending=False))
    constructors["Position"] = np.arange(1, len(constructors)+1)
    return {
        "model": model,
        "race_predictions": result[["season","round","driver","constructor","Predicted","Predicted Position","Predicted Points"]].to_dict(orient="records"),
        "drivers": standings.to_dict(orient="records"),
        "constructors": constructors.to_dict(orient="records")
    }

@app.post("/api/evaluate")
async def evaluate(file: UploadFile = File(...), model: str = "xgboost"):
    content = await file.read()
    df = clean_frame(read_any(content, file.filename))
    if TARGET not in df.columns:
        raise HTTPException(400, "Evaluation dataset needs a 'podium' target column.")
    # Time-aware split by season when possible.
    if "season" in df.columns and df["season"].nunique() > 1:
        seasons = sorted(df["season"].unique())
        cutoff = seasons[-1]
        train_df = df[df["season"] < cutoff]
        test_df = df[df["season"] == cutoff]
    else:
        cut = int(len(df)*0.8)
        train_df, test_df = df.iloc[:cut], df.iloc[cut:]
    result, _ = predict_frame(train_df, test_df, model)
    y = test_df[TARGET].astype(float).to_numpy()
    p = result["Predicted"].to_numpy()
    rmse = float(np.sqrt(mean_squared_error(y, p)))
    return {"model": model, "test_rows": len(test_df),
            "mae": float(mean_absolute_error(y,p)),
            "rmse": rmse, "r2": float(r2_score(y,p))}

@app.post("/api/export")
async def export(file: UploadFile = File(...), model: str = "xgboost"):
    content = await file.read()
    input_df = clean_frame(read_any(content, file.filename))
    train_df = pd.read_csv(DATASET)
    result, _ = predict_frame(train_df, input_df, model)
    buf = io.BytesIO()
    result.to_excel(buf, index=False)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition":"attachment; filename=apex_grid_predictions.xlsx"})
