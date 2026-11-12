from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.utils.security import get_current_user
from app.cache.redis_client import invalidate_user_cache
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentResponse,
    ExperimentCheckinCreate,
    ExperimentCheckinResponse,
    ActiveExperimentProgress,
    ExperimentEvaluationResponse,
    ExperimentCompleteRequest,
    ExperimentTemplate,
)
from app.services import experiment_service

router = APIRouter(route_class=CommitRoute)


@router.post(
    "",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new behavioral experiment with baseline calculation",
)
async def create_experiment_endpoint(
    data: ExperimentCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.create_experiment(db, user_id, data)
    invalidate_user_cache(user_id)
    return exp


@router.get(
    "",
    response_model=List[ExperimentResponse],
    summary="List all experiments for current user",
)
async def list_experiments_endpoint(
    status: Optional[str] = Query(None, description="Filter by DRAFT, ACTIVE, COMPLETED, ABANDONED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await experiment_service.get_experiments(
        db, user_id, status_filter=status, page=page, page_size=page_size
    )


@router.get(
    "/active",
    response_model=List[ActiveExperimentProgress],
    summary="Get real-time tracking progress for active experiments",
)
async def get_active_experiments_progress_endpoint(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await experiment_service.get_active_experiments_progress(db, user_id)


@router.get(
    "/templates",
    response_model=List[ExperimentTemplate],
    summary="Get curated scientific experiment templates",
)
async def get_experiment_templates_endpoint():
    return experiment_service.get_templates()


@router.get(
    "/{experiment_id}",
    response_model=ExperimentResponse,
    summary="Get a single experiment by ID",
)
async def get_experiment_endpoint(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await experiment_service.get_experiment_by_id(db, user_id, experiment_id)


@router.put(
    "/{experiment_id}",
    response_model=ExperimentResponse,
    summary="Update experiment details",
)
async def update_experiment_endpoint(
    experiment_id: str,
    data: ExperimentUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.update_experiment(db, user_id, experiment_id, data)
    invalidate_user_cache(user_id)
    return exp


@router.delete(
    "/{experiment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an experiment",
)
async def delete_experiment_endpoint(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await experiment_service.delete_experiment(db, user_id, experiment_id)
    invalidate_user_cache(user_id)


@router.post(
    "/{experiment_id}/checkin",
    response_model=ExperimentCheckinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log daily adherence checkin for an active experiment",
)
async def record_checkin_endpoint(
    experiment_id: str,
    data: ExperimentCheckinCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ck = await experiment_service.record_checkin(db, user_id, experiment_id, data)
    invalidate_user_cache(user_id)
    return ck


@router.get(
    "/{experiment_id}/checkins",
    response_model=List[ExperimentCheckinResponse],
    summary="Get all daily checkins for an experiment",
)
async def get_checkins_endpoint(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await experiment_service.get_checkins(db, user_id, experiment_id)


@router.post(
    "/{experiment_id}/evaluate",
    response_model=ExperimentEvaluationResponse,
    summary="Evaluate treatment period vs baseline and generate statistical verdict",
)
async def evaluate_experiment_endpoint(
    experiment_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    eval_res = await experiment_service.evaluate_experiment(db, user_id, experiment_id)
    invalidate_user_cache(user_id)
    return eval_res


@router.post(
    "/{experiment_id}/complete",
    response_model=ExperimentResponse,
    summary="Complete experiment, save rating/reflection, and optionally adopt as habit",
)
async def complete_experiment_endpoint(
    experiment_id: str,
    data: ExperimentCompleteRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.complete_experiment(db, user_id, experiment_id, data)
    invalidate_user_cache(user_id)
    return exp


@router.post(
    "/{experiment_id}/abandon",
    response_model=ExperimentResponse,
    summary="Abandon an active experiment",
)
async def abandon_experiment_endpoint(
    experiment_id: str,
    reason: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.abandon_experiment(db, user_id, experiment_id, reason=reason)
    invalidate_user_cache(user_id)
    return exp

