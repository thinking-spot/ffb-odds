from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..models.league import Matchup
from ..db import db

router = APIRouter()


@router.get("/league/{league_id}", response_model=List[Matchup])
async def get_league_matchups(
    league_id: str,
    week: int = Query(..., description="Week number"),
    season: int = Query(2024, description="Season year")
):
    """Get all matchups for a league in a specific week"""
    try:
        rows = await db.fetch_all(
            """
            SELECT * FROM matchups
            WHERE league_id = ? AND week = ? AND season = ?
            ORDER BY matchup_id
            """,
            (league_id, week, season)
        )

        matchups = [
            Matchup(
                matchup_id=row["matchup_id"],
                league_id=row["league_id"],
                week=row["week"],
                season=row["season"],
                team1_id=row["team1_id"],
                team2_id=row["team2_id"],
                team1_score=row["team1_score"],
                team2_score=row["team2_score"],
                is_completed=bool(row["is_completed"])
            )
            for row in rows
        ]

        return matchups

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{matchup_id}", response_model=Matchup)
async def get_matchup(matchup_id: str):
    """Get a specific matchup"""
    try:
        row = await db.fetch_one(
            "SELECT * FROM matchups WHERE matchup_id = ?",
            (matchup_id,)
        )

        if not row:
            raise HTTPException(status_code=404, detail="Matchup not found")

        matchup = Matchup(
            matchup_id=row["matchup_id"],
            league_id=row["league_id"],
            week=row["week"],
            season=row["season"],
            team1_id=row["team1_id"],
            team2_id=row["team2_id"],
            team1_score=row["team1_score"],
            team2_score=row["team2_score"],
            is_completed=bool(row["is_completed"])
        )

        return matchup

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
