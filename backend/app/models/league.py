from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Player(BaseModel):
    """Fantasy player model"""
    player_id: str
    name: str
    position: str  # QB, RB, WR, TE, K, DEF
    nfl_team: str
    yahoo_player_id: Optional[str] = None


class Team(BaseModel):
    """Fantasy team model"""
    team_id: str
    league_id: str
    name: str
    manager_name: str
    roster: List[Player] = []
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points_for: float = 0.0
    points_against: float = 0.0


class Matchup(BaseModel):
    """Fantasy matchup model"""
    matchup_id: str
    league_id: str
    week: int
    season: int
    team1_id: str
    team2_id: str
    team1_score: Optional[float] = None
    team2_score: Optional[float] = None
    is_completed: bool = False
    game_date: Optional[datetime] = None


class League(BaseModel):
    """Fantasy league model"""
    league_id: str
    name: str
    platform: str = "yahoo"  # yahoo, espn, sleeper, etc.
    season: int
    current_week: int
    num_teams: int
    scoring_type: str = "standard"  # standard, ppr, half_ppr
    teams: List[Team] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
