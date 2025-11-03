from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..models.efficiency import TeamEfficiency
from ..db import db
from datetime import datetime

router = APIRouter()


@router.get("/league/{league_id}", response_model=List[TeamEfficiency])
async def get_league_efficiency(
    league_id: str,
    week: int = Query(..., description="Week number"),
    season: int = Query(2024, description="Season year")
):
    """Get efficiency metrics for all teams in a league"""
    try:
        rows = await db.fetch_all(
            """
            SELECT * FROM team_efficiency
            WHERE league_id = ? AND week = ? AND season = ?
            ORDER BY power_rank
            """,
            (league_id, week, season)
        )

        efficiencies = [
            TeamEfficiency(
                team_id=row["team_id"],
                league_id=row["league_id"],
                season=row["season"],
                week=row["week"],
                wins=row["wins"],
                losses=row["losses"],
                ties=row["ties"],
                win_percentage=row["win_percentage"],
                points_for=row["points_for"],
                points_against=row["points_against"],
                points_differential=row["points_differential"],
                avg_points_for=row["avg_points_for"],
                avg_points_against=row["avg_points_against"],
                expected_wins=row["expected_wins"],
                expected_losses=row["expected_losses"],
                expected_win_percentage=row["expected_win_percentage"],
                luck_factor=row["luck_factor"],
                efficiency_rating=row["efficiency_rating"],
                strength_of_schedule=row["strength_of_schedule"],
                power_rank=row["power_rank"],
                record_rank=row["record_rank"],
                points_for_rank=row["points_for_rank"],
                points_against_rank=row["points_against_rank"],
                playoff_probability=row["playoff_probability"],
                updated_at=datetime.fromisoformat(row["updated_at"])
            )
            for row in rows
        ]

        return efficiencies

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{team_id}", response_model=TeamEfficiency)
async def get_team_efficiency(
    team_id: str,
    week: int = Query(..., description="Week number"),
    season: int = Query(2024, description="Season year")
):
    """Get efficiency metrics for a specific team"""
    try:
        row = await db.fetch_one(
            """
            SELECT * FROM team_efficiency
            WHERE team_id = ? AND week = ? AND season = ?
            """,
            (team_id, week, season)
        )

        if not row:
            raise HTTPException(status_code=404, detail="Team efficiency data not found")

        efficiency = TeamEfficiency(
            team_id=row["team_id"],
            league_id=row["league_id"],
            season=row["season"],
            week=row["week"],
            wins=row["wins"],
            losses=row["losses"],
            ties=row["ties"],
            win_percentage=row["win_percentage"],
            points_for=row["points_for"],
            points_against=row["points_against"],
            points_differential=row["points_differential"],
            avg_points_for=row["avg_points_for"],
            avg_points_against=row["avg_points_against"],
            expected_wins=row["expected_wins"],
            expected_losses=row["expected_losses"],
            expected_win_percentage=row["expected_win_percentage"],
            luck_factor=row["luck_factor"],
            efficiency_rating=row["efficiency_rating"],
            strength_of_schedule=row["strength_of_schedule"],
            power_rank=row["power_rank"],
            record_rank=row["record_rank"],
            points_for_rank=row["points_for_rank"],
            points_against_rank=row["points_against_rank"],
            playoff_probability=row["playoff_probability"],
            updated_at=datetime.fromisoformat(row["updated_at"])
        )

        return efficiency

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
