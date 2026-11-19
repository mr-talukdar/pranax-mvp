from fastapi import FastAPI

app = FastAPI(title="PranaX Intelligence", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "intelligence", "status": "ok"}
