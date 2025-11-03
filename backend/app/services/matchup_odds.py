from typing import Optional
from datetime import datetime
import math
from ..models.odds import MatchupOdds
from ..models.projections import TeamProjection
from ..models.league import Matchup


class MatchupOddsGenerator:
    """
    Generate Vegas-style odds for fantasy matchups
    Based on projected points for each team
    """

    def generate_matchup_odds(
        self,
        matchup: Matchup,
        team1_projection: TeamProjection,
        team2_projection: TeamProjection,
        team1_name: str,
        team2_name: str
    ) -> MatchupOdds:
        """
        Generate odds for a fantasy matchup
        Returns moneylines, win probabilities, and spread
        """
        proj1 = team1_projection.total_projected_points
        proj2 = team2_projection.total_projected_points

        # Calculate projected spread
        spread = proj1 - proj2

        # Convert spread to win probability using logistic function
        # Roughly: 10 point spread = ~75% win probability
        # Formula: P(win) = 1 / (1 + e^(-spread/k)) where k is scaling factor
        k = 15  # Scaling factor (adjust for fantasy football)
        prob1 = 1 / (1 + math.exp(-spread / k))
        prob2 = 1 - prob1

        # Convert win probability to American odds (moneyline)
        ml1 = self._probability_to_moneyline(prob1)
        ml2 = self._probability_to_moneyline(prob2)

        # Determine confidence level based on projection confidence
        confidence = self._determine_matchup_confidence(
            team1_projection,
            team2_projection
        )

        matchup_odds = MatchupOdds(
            matchup_id=matchup.matchup_id,
            league_id=matchup.league_id,
            week=matchup.week,
            season=matchup.season,
            team1_id=matchup.team1_id,
            team1_name=team1_name,
            team1_projected_points=proj1,
            team1_moneyline=ml1,
            team1_win_probability=prob1,
            team2_id=matchup.team2_id,
            team2_name=team2_name,
            team2_projected_points=proj2,
            team2_moneyline=ml2,
            team2_win_probability=prob2,
            projected_spread=spread,
            confidence_level=confidence,
            updated_at=datetime.utcnow()
        )

        return matchup_odds

    def _probability_to_moneyline(self, probability: float) -> int:
        """
        Convert win probability to American odds (moneyline)

        For favorites (probability > 0.5):
            Moneyline = -100 * (probability / (1 - probability))

        For underdogs (probability < 0.5):
            Moneyline = 100 * ((1 - probability) / probability)

        Examples:
            90% win probability → -900 (heavy favorite)
            75% → -300
            50% → +100 (even)
            25% → +300
            10% → +900 (heavy underdog)
        """
        if probability >= 0.99:
            return -10000  # Extreme favorite
        elif probability <= 0.01:
            return 10000  # Extreme underdog
        elif probability > 0.5:
            # Favorite (negative moneyline)
            ml = -100 * (probability / (1 - probability))
            return int(ml)
        elif probability < 0.5:
            # Underdog (positive moneyline)
            ml = 100 * ((1 - probability) / probability)
            return int(ml)
        else:
            # Even odds
            return 100

    def _determine_matchup_confidence(
        self,
        team1_proj: TeamProjection,
        team2_proj: TeamProjection
    ) -> str:
        """
        Determine confidence level for matchup odds
        Based on projection confidence of both teams
        """
        confidences = [team1_proj.confidence, team2_proj.confidence]

        if all(c == "high" for c in confidences):
            return "high"
        elif any(c == "low" for c in confidences):
            return "low"
        else:
            return "medium"

    def get_implied_probability(self, moneyline: int) -> float:
        """
        Convert American odds back to implied probability
        (Inverse of _probability_to_moneyline)
        """
        if moneyline < 0:
            # Favorite
            return abs(moneyline) / (abs(moneyline) + 100)
        else:
            # Underdog
            return 100 / (moneyline + 100)

    def calculate_expected_value(
        self,
        bet_amount: float,
        moneyline: int,
        true_probability: float
    ) -> float:
        """
        Calculate expected value of a bet
        EV = (Probability of Win × Profit) - (Probability of Loss × Stake)
        """
        implied_prob = self.get_implied_probability(moneyline)

        if moneyline < 0:
            profit = bet_amount * (100 / abs(moneyline))
        else:
            profit = bet_amount * (moneyline / 100)

        ev = (true_probability * profit) - ((1 - true_probability) * bet_amount)
        return ev
