# PranaX intelligence service

This independent Python package owns analytics and intelligence endpoints. It currently exposes only a FastAPI health endpoint; retention scoring and model pipelines are intentionally not implemented in the bootstrap.

```bash
python3 -m venv .venv-intelligence
.venv-intelligence/bin/pip install -e 'services/intelligence[test]'
.venv-intelligence/bin/pytest services/intelligence/tests
.venv-intelligence/bin/uvicorn pranax_intelligence.main:app --app-dir services/intelligence/src --port 8000
```

The service must receive explicitly authorized, tenant-scoped data through a documented boundary. It must not bypass API authorization or mix tenant records.
