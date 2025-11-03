from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..models.odds import MatchupOdds, TeamOdds
from ..db import db
from datetime import datetime

router = APIRouter()


@router.get("/matchup/{matchup_id}", response_model=MatchupOdds)
async def get_matchup_odds(matchup_id: str):
    """Get odds for a specific matchup"""
    try:
        row = await db.fetch_one(
            "SELECT * FROM matchup_odds WHERE matchup_id = ?",
            (matchup_id,)
        )

        if not row:
            raise HTTPException(status_code=404, detail="Matchup odds not found")

        # Get team names
        team1_row = await db.fetch_one(
            "SELECT name FROM teams WHERE team_id = ?",
            (row["team1_id"],)
        )
        team2_row = await db.fetch_one(
            "SELECT name FROM teams WHERE team_id = ?",
            (row["team2_id"],)
        )

        odds = MatchupOdds(
            matchup_id=row["matchup_id"],
            league_id=row["league_id"],
            week=row["week"],
            season=row["season"],
            team1_id=row["team1_id"],
            team1_name=team1_row["name"] if team1_row else "Team 1",
            team1_projected_points=row["team1_projected_points"],
            team1_moneyline=row["team1_moneyline"],
            team1_win_probability=row["team1_win_probability"],
            team2_id=row["team2_id"],
            team2_name=team2_row["name"] if team2_row else "Team 2",
            team2_projected_points=row["team2_projected_points"],
            team2_moneyline=row["team2_moneyline"],
            team2_win_probability=row["team2_win_probability"],
            projected_spread=row["projected_spread"],
            confidence_level=row["confidence_level"],
            updated_at=datetime.fromisoformat(row["updated_at"])
        )

        return odds

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/league/{league_id}/week/{week}", response_model=List[MatchupOdds])
async def get_league_week_odds(
    league_id: str,
    week: int,
    season: int = Query(2024, description="Season year")
):
    """Get all matchup odds for a league in a specific week"""
    try:
        rows = await db.fetch_all(
            """
            SELECT mo.*, t1.name as team1_name, t2.name as team2_name
            FROM matchup_odds mo
            LEFT JOIN teams t1 ON mo.team1_id = t1.team_id
            LEFT JOIN teams t2 ON mo.team2_id = t2.team_id
            WHERE mo.league_id = ? AND mo.week = ? AND mo.season = ?
            ORDER BY mo.matchup_id
            """,
            (league_id, week, season)
        )

        odds_list = [
            MatchupOdds(
                matchup_id=row["matchup_id"],
                league_id=row["league_id"],
                week=row["week"],
                season=row["season"],
                team1_id=row["team1_id"],
                team1_name=row["team1_name"] or "Team 1",
                team1_projected_points=row["team1_projected_points"],
                team1_moneyline=row["team1_moneyline"],
                team1_win_probability=row["team1_win_probability"],
                team2_id=row["team2_id"],
                team2_name=row["team2_name"] or "Team 2",
                team2_projected_points=row["team2_projected_points"],
                team2_moneyline=row["team2_moneyline"],
                team2_win_probability=row["team2_win_probability"],
                projected_spread=row["projected_spread"],
                confidence_level=row["confidence_level"],
                updated_at=datetime.fromisoformat(row["updated_at"])
            )
            for row in rows
        ]

        return odds_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nfl/week/{week}", response_model=List[TeamOdds])
async def get_nfl_week_odds(
    week: int,
    season: int = Query(2024, description="Season year")
):
    """Get NFL team odds for a specific week"""
    try:
        rows = await db.fetch_all(
            """
            SELECT * FROM team_odds
            WHERE week = ? AND season = ?
            ORDER BY nfl_team
            """,
            (week, season)
        )

        odds_list = [
            TeamOdds(
                nfl_team=row["nfl_team"],
                opponent=row["opponent"],
                week=row["week"],
                season=row["season"],
                team_total_over_under=row["team_total_ou"],
                spread=row["spread"],
                moneyline=row["moneyline"],
                win_probability=row["win_probability"],
                game_time=datetime.fromisoformat(row["game_time"]),
                updated_at=datetime.fromisoformat(row["updated_at"])
            )
            for row in rows
        ]

        return odds_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
