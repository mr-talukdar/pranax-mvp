FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

# Create a non-root application user
RUN groupadd -r pranax && useradd -r -g pranax -d /app -s /sbin/nologin pranax

COPY pyproject.toml .
COPY src/ ./src/

RUN pip install --no-cache-dir . && chown -R pranax:pranax /app

USER pranax

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn pranax_intelligence.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
