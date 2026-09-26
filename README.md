# APEX GRID

F1 Prediction Intelligence & Beginner Guide.

## Stack
- Frontend: React + Vite + Recharts + Framer Motion
- Backend: FastAPI + pandas + scikit-learn + XGBoost
- Models: Linear Regression, MLPRegressor, XGBRegressor

## Run backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` for the API. Set `VITE_API_URL` if the backend is deployed elsewhere.

## Dataset
`data/df_f1.csv` is the supplied historical dataset and is used as the demo training dataset. The model treats `podium` as the target and aligns inference columns by name.

## Important
For a production ML study, create a strict time-aware training/evaluation pipeline where all point/standing features are guaranteed to be pre-race snapshots. The app includes a visible leakage note because columns such as current points/standings can leak future information if constructed from post-race data.
