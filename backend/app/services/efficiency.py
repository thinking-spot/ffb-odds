from typing import List, Dict
from datetime import datetime
import math
from ..models.efficiency import TeamEfficiency
from ..models.league import Team
from ..models.projections import TeamProjection


class EfficiencyCalculator:
    """
    Calculate team efficiency metrics similar to KenPom for college basketball
    Key metric: Expected wins based on points (Pythagorean expectation)
    """

    def __init__(self, pythagorean_exponent: float = 2.37):
        """
        Initialize with Pythagorean exponent
        Default 2.37 is common for fantasy football (similar to NBA/NFL)
        """
        self.pythagorean_exponent = pythagorean_exponent

    def calculate_expected_wins(
        self,
        points_for: float,
        points_against: float,
        games_played: int
    ) -> float:
        """
        Calculate expected wins using Pythagorean expectation
        Formula: W% = PF^X / (PF^X + PA^X)
        Where X is the Pythagorean exponent (typically 2.37 for fantasy/football)
        """
        if points_for <= 0 or points_against <= 0:
            return 0.0

        pf_exp = math.pow(points_for, self.pythagorean_exponent)
        pa_exp = math.pow(points_against, self.pythagorean_exponent)

        expected_win_pct = pf_exp / (pf_exp + pa_exp)
        expected_wins = expected_win_pct * games_played

        return expected_wins

    def calculate_efficiency_rating(
        self,
        avg_points_for: float,
        avg_points_against: float,
        league_avg_ppg: float = 100.0
    ) -> float:
        """
        Calculate efficiency rating (100 = league average)
        Higher is better
        Formula: ((PF / League_Avg) / (PA / League_Avg)) * 100
        """
        if league_avg_ppg <= 0 or avg_points_against <= 0:
            return 100.0

        offensive_rating = avg_points_for / league_avg_ppg
        defensive_rating = avg_points_against / league_avg_ppg

        # Better offense and better defense (lower PA) = higher rating
        efficiency = (offensive_rating / defensive_rating) * 100

        return efficiency

    def calculate_luck_factor(
        self,
        actual_wins: int,
        expected_wins: float
    ) -> float:
        """
        Calculate luck factor
        Positive = lucky (more wins than expected)
        Negative = unlucky (fewer wins than expected)
        """
        return actual_wins - expected_wins

    def calculate_strength_of_schedule(
        self,
        opponent_ratings: List[float]
    ) -> float:
        """
        Calculate strength of schedule
        Average opponent efficiency rating
        """
        if not opponent_ratings:
            return 100.0

        return sum(opponent_ratings) / len(opponent_ratings)

    def calculate_playoff_probability(
        self,
        team_efficiency: TeamEfficiency,
        all_team_efficiencies: List[TeamEfficiency],
        weeks_remaining: int,
        playoff_spots: int = 6
    ) -> float:
        """
        Estimate playoff probability using Monte Carlo-ish approach
        Based on current record, expected wins, and weeks remaining
        """
        if weeks_remaining <= 0:
            # Season over - either in or out
            current_rank = self._get_rank_by_record(team_efficiency, all_team_efficiencies)
            return 1.0 if current_rank <= playoff_spots else 0.0

        # Current wins
        current_wins = team_efficiency.wins + (team_efficiency.ties * 0.5)

        # Expected wins for remaining games
        # Use expected win % to project remaining games
        remaining_expected_wins = team_efficiency.expected_win_percentage * weeks_remaining

        # Projected final wins
        projected_wins = current_wins + remaining_expected_wins

        # Compare to other teams' projected wins
        all_projected_wins = []
        for other_team in all_team_efficiencies:
            other_current = other_team.wins + (other_team.ties * 0.5)
            other_remaining = other_team.expected_win_percentage * weeks_remaining
            all_projected_wins.append(other_current + other_remaining)

        # Sort and see where this team ranks
        all_projected_wins.sort(reverse=True)

        # Calculate probability based on distribution
        # If clearly in playoff position: high probability
        # If on the bubble: moderate probability
        # If clearly out: low probability

        if projected_wins >= all_projected_wins[playoff_spots - 1]:
            # Above playoff line
            gap = projected_wins - all_projected_wins[playoff_spots - 1]
            probability = min(0.95, 0.7 + (gap * 0.1))
        else:
            # Below playoff line
            gap = all_projected_wins[playoff_spots - 1] - projected_wins
            probability = max(0.05, 0.3 - (gap * 0.1))

        return probability

    def _get_rank_by_record(
        self,
        team: TeamEfficiency,
        all_teams: List[TeamEfficiency]
    ) -> int:
        """Get team's rank by actual record"""
        sorted_teams = sorted(
            all_teams,
            key=lambda t: (t.wins, t.points_for),
            reverse=True
        )
        for i, t in enumerate(sorted_teams):
            if t.team_id == team.team_id:
                return i + 1
        return len(all_teams)

    async def calculate_team_efficiency(
        self,
        team: Team,
        week: int,
        season: int,
        league_avg_ppg: float,
        all_teams: List[Team],
        weeks_remaining: int
    ) -> TeamEfficiency:
        """
        Calculate all efficiency metrics for a team
        """
        games_played = team.wins + team.losses + team.ties

        if games_played == 0:
            games_played = 1  # Avoid division by zero

        # Basic stats
        avg_pf = team.points_for / games_played
        avg_pa = team.points_against / games_played
        win_pct = team.wins / games_played if games_played > 0 else 0.0

        # Expected wins
        expected_wins = self.calculate_expected_wins(
            team.points_for,
            team.points_against,
            games_played
        )
        expected_losses = games_played - expected_wins
        expected_win_pct = expected_wins / games_played if games_played > 0 else 0.0

        # Luck factor
        luck = self.calculate_luck_factor(team.wins, expected_wins)

        # Efficiency rating
        efficiency_rating = self.calculate_efficiency_rating(
            avg_pf,
            avg_pa,
            league_avg_ppg
        )

        # Create efficiency object (rankings will be calculated separately)
        efficiency = TeamEfficiency(
            team_id=team.team_id,
            league_id=team.league_id,
            season=season,
            week=week,
            wins=team.wins,
            losses=team.losses,
            ties=team.ties,
            win_percentage=win_pct,
            points_for=team.points_for,
            points_against=team.points_against,
            points_differential=team.points_for - team.points_against,
            avg_points_for=avg_pf,
            avg_points_against=avg_pa,
            expected_wins=expected_wins,
            expected_losses=expected_losses,
            expected_win_percentage=expected_win_pct,
            luck_factor=luck,
            efficiency_rating=efficiency_rating,
            strength_of_schedule=100.0,  # Calculated later with all teams
            power_rank=0,  # Calculated after all teams
            record_rank=0,
            points_for_rank=0,
            points_against_rank=0,
            playoff_probability=0.0,  # Calculated later
            updated_at=datetime.utcnow()
        )

        return efficiency

    def calculate_league_rankings(
        self,
        efficiencies: List[TeamEfficiency],
        weeks_remaining: int,
        playoff_spots: int = 6
    ) -> List[TeamEfficiency]:
        """
        Calculate rankings across all teams in the league
        """
        # Power rankings (by efficiency rating)
        sorted_by_rating = sorted(efficiencies, key=lambda e: e.efficiency_rating, reverse=True)
        for i, eff in enumerate(sorted_by_rating):
            eff.power_rank = i + 1

        # Record rankings (by wins, then points for)
        sorted_by_record = sorted(
            efficiencies,
            key=lambda e: (e.wins, e.points_for),
            reverse=True
        )
        for i, eff in enumerate(sorted_by_record):
            eff.record_rank = i + 1

        # Points for rankings
        sorted_by_pf = sorted(efficiencies, key=lambda e: e.points_for, reverse=True)
        for i, eff in enumerate(sorted_by_pf):
            eff.points_for_rank = i + 1

        # Points against rankings (lower is better)
        sorted_by_pa = sorted(efficiencies, key=lambda e: e.points_against)
        for i, eff in enumerate(sorted_by_pa):
            eff.points_against_rank = i + 1

        # Calculate playoff probabilities
        for eff in efficiencies:
            eff.playoff_probability = self.calculate_playoff_probability(
                eff,
                efficiencies,
                weeks_remaining,
                playoff_spots
            )

        return efficiencies
