from pydantic import BaseModel
from datetime import datetime


class TeamEfficiency(BaseModel):
    """Team efficiency metrics (KenPom-style for fantasy)"""
    team_id: str
    league_id: str
    season: int
    week: int  # Current week

    # Actual record
    wins: int
    losses: int
    ties: int
    win_percentage: float

    # Points
    points_for: float
    points_against: float
    points_differential: float

    avg_points_for: float
    avg_points_against: float

    # Expected wins (Pythagorean expectation)
    expected_wins: float
    expected_losses: float
    expected_win_percentage: float

    # Efficiency rating
    luck_factor: float  # Positive means "lucky" (actual wins > expected wins)
    efficiency_rating: float  # 100 = average, >100 = better than average

    # Strength metrics
    strength_of_schedule: float  # Average opponent efficiency rating
    strength_of_wins: float  # Average defeated opponent efficiency rating
    strength_of_losses: float  # Average losing opponent efficiency rating

    # Rankings (within league)
    power_rank: int  # Based on efficiency rating
    record_rank: int  # Based on actual wins
    points_for_rank: int
    points_against_rank: int

    # Playoff probability
    playoff_probability: float  # 0.0 to 1.0

    updated_at: datetime
