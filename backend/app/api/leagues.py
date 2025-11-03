from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.league import League, Team
from ..services.yahoo import YahooFantasyService
from ..db import db

router = APIRouter()


@router.post("/", response_model=League)
async def add_league(
    league_id: str = Query(..., description="Yahoo league ID"),
    season: int = Query(2024, description="Season year")
):
    """
    Add a new league to track
    Fetches league data from Yahoo and stores it
    """
    yahoo_service = YahooFantasyService()

    try:
        # Fetch league data from Yahoo
        league = await yahoo_service.get_league(league_id, season)

        if not league:
            raise HTTPException(status_code=404, detail="League not found or not accessible")

        # Store league in database
        await db.execute(
            """
            INSERT OR REPLACE INTO leagues
            (league_id, name, platform, season, current_week, num_teams, scoring_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                league.league_id,
                league.name,
                league.platform,
                league.season,
                league.current_week,
                league.num_teams,
                league.scoring_type
            )
        )

        # Store teams
        for team in league.teams:
            await db.execute(
                """
                INSERT OR REPLACE INTO teams
                (team_id, league_id, name, manager_name, wins, losses, ties, points_for, points_against)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    team.team_id,
                    team.league_id,
                    team.name,
                    team.manager_name,
                    team.wins,
                    team.losses,
                    team.ties,
                    team.points_for,
                    team.points_against
                )
            )

        return league

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await yahoo_service.close()


@router.get("/", response_model=List[League])
async def get_leagues(season: Optional[int] = None):
    """Get all tracked leagues"""
    try:
        if season:
            rows = await db.fetch_all(
                "SELECT * FROM leagues WHERE season = ? ORDER BY created_at DESC",
                (season,)
            )
        else:
            rows = await db.fetch_all(
                "SELECT * FROM leagues ORDER BY created_at DESC"
            )

        leagues = []
        for row in rows:
            league = League(
                league_id=row["league_id"],
                name=row["name"],
                platform=row["platform"],
                season=row["season"],
                current_week=row["current_week"],
                num_teams=row["num_teams"],
                scoring_type=row["scoring_type"]
            )
            leagues.append(league)

        return leagues

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{league_id}", response_model=League)
async def get_league(league_id: str):
    """Get a specific league"""
    try:
        row = await db.fetch_one(
            "SELECT * FROM leagues WHERE league_id = ?",
            (league_id,)
        )

        if not row:
            raise HTTPException(status_code=404, detail="League not found")

        # Get teams
        team_rows = await db.fetch_all(
            "SELECT * FROM teams WHERE league_id = ?",
            (league_id,)
        )

        teams = [
            Team(
                team_id=t["team_id"],
                league_id=t["league_id"],
                name=t["name"],
                manager_name=t["manager_name"],
                wins=t["wins"],
                losses=t["losses"],
                ties=t["ties"],
                points_for=t["points_for"],
                points_against=t["points_against"]
            )
            for t in team_rows
        ]

        league = League(
            league_id=row["league_id"],
            name=row["name"],
            platform=row["platform"],
            season=row["season"],
            current_week=row["current_week"],
            num_teams=row["num_teams"],
            scoring_type=row["scoring_type"],
            teams=teams
        )

        return league

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{league_id}/teams", response_model=List[Team])
async def get_league_teams(league_id: str):
    """Get all teams in a league"""
    try:
        rows = await db.fetch_all(
            "SELECT * FROM teams WHERE league_id = ? ORDER BY wins DESC, points_for DESC",
            (league_id,)
        )

        teams = [
            Team(
                team_id=row["team_id"],
                league_id=row["league_id"],
                name=row["name"],
                manager_name=row["manager_name"],
                wins=row["wins"],
                losses=row["losses"],
                ties=row["ties"],
                points_for=row["points_for"],
                points_against=row["points_against"]
            )
            for row in rows
        ]

        return teams

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{league_id}")
async def delete_league(league_id: str):
    """Remove a league from tracking"""
    try:
        await db.execute(
            "DELETE FROM leagues WHERE league_id = ?",
            (league_id,)
        )
        return {"message": "League deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
