from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PlayerProjection(BaseModel):
    """Projected fantasy points for a player"""
    player_id: str
    player_name: str
    position: str
    nfl_team: str
    week: int
    season: int

    # Projection breakdown
    passing_yards: float = 0.0
    passing_tds: float = 0.0
    passing_interceptions: float = 0.0

    rushing_yards: float = 0.0
    rushing_tds: float = 0.0

    receiving_yards: float = 0.0
    receptions: float = 0.0
    receiving_tds: float = 0.0

    field_goals: float = 0.0
    extra_points: float = 0.0

    # Defense/Special Teams
    points_allowed: float = 0.0
    sacks: float = 0.0
    interceptions: float = 0.0
    fumbles_recovered: float = 0.0
    touchdowns: float = 0.0

    # Total projected fantasy points (calculated based on league scoring)
    projected_points_standard: float = 0.0
    projected_points_ppr: float = 0.0
    projected_points_half_ppr: float = 0.0

    # Confidence in projection
    confidence: str = "medium"  # low, medium, high

    # Data sources used
    used_player_props: bool = False
    used_team_total: bool = False
    used_historical_share: bool = False

    updated_at: datetime


class TeamProjection(BaseModel):
    """Projected total points for a fantasy team"""
    team_id: str
    league_id: str
    week: int
    season: int

    # Roster projections
    player_projections: List[PlayerProjection] = []

    # Starting lineup projections
    starting_qb_points: float = 0.0
    starting_rb_points: float = 0.0
    starting_wr_points: float = 0.0
    starting_te_points: float = 0.0
    starting_flex_points: float = 0.0
    starting_k_points: float = 0.0
    starting_def_points: float = 0.0

    # Total projected points
    total_projected_points: float = 0.0

    # Projection range
    optimistic_projection: float = 0.0  # +1 std dev
    pessimistic_projection: float = 0.0  # -1 std dev

    confidence: str = "medium"

    updated_at: datetime
