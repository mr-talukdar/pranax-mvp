import hmac
import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .contracts import (
    AssistantAnswerOutput,
    AssistantOperationInput,
    AssistantRouteInput,
    AssistantRoutingOutput,
    AssistantSuggestionsInput,
    AssistantSuggestionsOutput,
    AssessmentInput,
    AssessmentOutput,
)
from .conversation import (
    answer_studio_operation,
    route_studio_question,
    suggest_studio_questions,
)
from .engine import assess_retention

app = FastAPI(title="PranaX Intelligence", version="0.1.0")


def require_service_token(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = os.environ.get("INTELLIGENCE_SERVICE_TOKEN", "")
    if len(expected) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "service_auth_not_configured", "message": "Service authentication is unavailable."},
        )
    scheme, separator, supplied = (authorization or "").partition(" ")
    if not separator or scheme.lower() != "bearer" or not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "A valid service credential is required."},
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, error: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "invalid_assessment_input",
                "message": "The assessment request is invalid.",
                "issues": [
                    {"path": list(item["loc"]), "message": item["msg"], "type": item["type"]}
                    for item in error.errors()
                ],
            }
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "intelligence", "status": "ok"}


@app.post(
    "/api/v1/retention/assess",
    response_model=AssessmentOutput,
    dependencies=[Depends(require_service_token)],
)
def retention_assessment(payload: AssessmentInput) -> AssessmentOutput:
    return assess_retention(payload)


@app.post(
    "/api/v1/assistant/suggestions",
    response_model=AssistantSuggestionsOutput,
    dependencies=[Depends(require_service_token)],
)
def assistant_suggestions(
    payload: AssistantSuggestionsInput,
) -> AssistantSuggestionsOutput:
    return suggest_studio_questions(payload)


@app.post(
    "/api/v1/assistant/route",
    response_model=AssistantRoutingOutput,
    dependencies=[Depends(require_service_token)],
)
def assistant_route(payload: AssistantRouteInput) -> AssistantRoutingOutput:
    return route_studio_question(payload)


@app.post(
    "/api/v1/assistant/answer",
    response_model=AssistantAnswerOutput,
    dependencies=[Depends(require_service_token)],
)
def assistant_answer(payload: AssistantOperationInput) -> AssistantAnswerOutput:
    return answer_studio_operation(payload)
