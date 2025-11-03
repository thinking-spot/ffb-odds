import httpx
import os
from typing import Dict, List, Optional
from datetime import datetime
from ..models.odds import PlayerOdds, TeamOdds


class OddsAPIService:
    """
    Service for fetching Vegas odds from The Odds API
    Docs: https://the-odds-api.com/liveapi/guides/v4/
    """

    BASE_URL = "https://api.the-odds-api.com/v4"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ODDS_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def get_nfl_odds(self, markets: List[str] = None) -> List[Dict]:
        """
        Fetch NFL odds from The Odds API
        Markets: h2h (moneyline), spreads, totals, player_props
        """
        if not self.api_key:
            raise ValueError("ODDS_API_KEY not configured")

        if markets is None:
            markets = ["h2h", "spreads", "totals"]

        url = f"{self.BASE_URL}/sports/americanfootball_nfl/odds"
        params = {
            "apiKey": self.api_key,
            "regions": "us",
            "markets": ",".join(markets),
            "oddsFormat": "american",
            "dateFormat": "iso"
        }

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching NFL odds: {str(e)}")
            return []

    async def get_team_odds_by_week(self, week: int, season: int = 2024) -> List[TeamOdds]:
        """
        Get NFL team odds organized by week
        """
        odds_data = await self.get_nfl_odds()
        team_odds_list = []

        for game in odds_data:
            home_team = game.get("home_team")
            away_team = game.get("away_team")
            commence_time = datetime.fromisoformat(game.get("commence_time").replace("Z", "+00:00"))

            # Extract odds from bookmakers (using first available)
            bookmakers = game.get("bookmakers", [])
            if not bookmakers:
                continue

            bookmaker = bookmakers[0]
            markets = bookmaker.get("markets", [])

            # Parse different market types
            totals = self._find_market(markets, "totals")
            spreads = self._find_market(markets, "spreads")
            h2h = self._find_market(markets, "h2h")

            # Create odds for home team
            home_odds = TeamOdds(
                nfl_team=home_team,
                opponent=away_team,
                week=week,
                season=season,
                team_total_ou=self._get_team_total(totals, home_team, is_home=True),
                spread=self._get_spread(spreads, home_team),
                moneyline=self._get_moneyline(h2h, home_team),
                win_probability=self._moneyline_to_probability(self._get_moneyline(h2h, home_team)),
                game_time=commence_time,
                updated_at=datetime.utcnow()
            )
            team_odds_list.append(home_odds)

            # Create odds for away team
            away_odds = TeamOdds(
                nfl_team=away_team,
                opponent=home_team,
                week=week,
                season=season,
                team_total_ou=self._get_team_total(totals, away_team, is_home=False),
                spread=self._get_spread(spreads, away_team),
                moneyline=self._get_moneyline(h2h, away_team),
                win_probability=self._moneyline_to_probability(self._get_moneyline(h2h, away_team)),
                game_time=commence_time,
                updated_at=datetime.utcnow()
            )
            team_odds_list.append(away_odds)

        return team_odds_list

    async def get_player_props(self, week: int, season: int = 2024) -> List[PlayerOdds]:
        """
        Get player prop odds
        Note: Player props are premium on The Odds API
        """
        # Player props require specific endpoints and are often premium
        # This is a placeholder for the structure
        player_odds_list = []

        try:
            # Would call specialized player props endpoint
            # url = f"{self.BASE_URL}/sports/americanfootball_nfl/events/{event_id}/odds"
            # markets: player_pass_yds, player_pass_tds, player_rush_yds, etc.
            pass
        except Exception as e:
            print(f"Error fetching player props: {str(e)}")

        return player_odds_list

    def _find_market(self, markets: List[Dict], market_key: str) -> Optional[Dict]:
        """Find a specific market type in the markets list"""
        for market in markets:
            if market.get("key") == market_key:
                return market
        return None

    def _get_team_total(self, totals_market: Optional[Dict], team: str, is_home: bool) -> Optional[float]:
        """Extract team total from totals market"""
        if not totals_market:
            return None

        outcomes = totals_market.get("outcomes", [])
        if len(outcomes) < 2:
            return None

        # Total is usually the same for both, but we'll take the Over line
        over_outcome = next((o for o in outcomes if o.get("name") == "Over"), None)
        if over_outcome:
            total_line = over_outcome.get("point")
            # Team total is typically half of game total (rough estimate)
            return total_line / 2 if total_line else None

        return None

    def _get_spread(self, spreads_market: Optional[Dict], team: str) -> Optional[float]:
        """Extract spread for a team"""
        if not spreads_market:
            return None

        outcomes = spreads_market.get("outcomes", [])
        for outcome in outcomes:
            if outcome.get("name") == team:
                return outcome.get("point")

        return None

    def _get_moneyline(self, h2h_market: Optional[Dict], team: str) -> Optional[int]:
        """Extract moneyline for a team"""
        if not h2h_market:
            return None

        outcomes = h2h_market.get("outcomes", [])
        for outcome in outcomes:
            if outcome.get("name") == team:
                return int(outcome.get("price", 0))

        return None

    def _moneyline_to_probability(self, moneyline: Optional[int]) -> Optional[float]:
        """
        Convert American odds to win probability
        Positive odds (underdog): probability = 100 / (odds + 100)
        Negative odds (favorite): probability = |odds| / (|odds| + 100)
        """
        if moneyline is None:
            return None

        if moneyline > 0:
            # Underdog
            return 100 / (moneyline + 100)
        elif moneyline < 0:
            # Favorite
            return abs(moneyline) / (abs(moneyline) + 100)
        else:
            return 0.5

    async def get_remaining_requests(self) -> Optional[int]:
        """Check how many API requests remain in quota"""
        # The Odds API returns remaining requests in response headers
        # This is tracked automatically
        return None
