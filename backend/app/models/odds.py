from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlayerOdds(BaseModel):
    """Vegas odds for individual player props"""
    player_id: str
    player_name: str
    nfl_team: str
    position: str
    week: int
    season: int

    # Passing props
    passing_yards_over_under: Optional[float] = None
    passing_tds_over_under: Optional[float] = None

    # Rushing props
    rushing_yards_over_under: Optional[float] = None
    rushing_tds_over_under: Optional[float] = None

    # Receiving props
    receiving_yards_over_under: Optional[float] = None
    receptions_over_under: Optional[float] = None
    receiving_tds_over_under: Optional[float] = None

    # Kicking props
    field_goals_over_under: Optional[float] = None
    extra_points_over_under: Optional[float] = None

    # Team defense (when player_id represents a DEF)
    points_allowed_over_under: Optional[float] = None
    sacks_over_under: Optional[float] = None

    updated_at: datetime


class TeamOdds(BaseModel):
    """Vegas odds for NFL teams"""
    nfl_team: str
    opponent: str
    week: int
    season: int

    # Team totals
    team_total_over_under: Optional[float] = None

    # Spread
    spread: Optional[float] = None  # Negative if favored

    # Moneyline
    moneyline: Optional[int] = None

    # Win probability (derived from moneyline)
    win_probability: Optional[float] = None

    game_time: datetime
    updated_at: datetime


class MatchupOdds(BaseModel):
    """Generated odds for fantasy matchup"""
    matchup_id: str
    league_id: str
    week: int
    season: int

    team1_id: str
    team1_name: str
    team1_projected_points: float
    team1_moneyline: int  # e.g., -1000 (heavy favorite) or +650 (underdog)
    team1_win_probability: float  # 0.0 to 1.0

    team2_id: str
    team2_name: str
    team2_projected_points: float
    team2_moneyline: int
    team2_win_probability: float

    projected_spread: float  # Team1 - Team2

    confidence_level: str = "medium"  # low, medium, high based on data quality

    updated_at: datetime
