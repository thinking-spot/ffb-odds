from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import os
import pytz
from datetime import datetime

from .services import (
    YahooFantasyService,
    OddsAPIService,
    NFLAPIService,
    ProjectionEngine,
    EfficiencyCalculator,
    MatchupOddsGenerator
)
from .db import db

# Global scheduler instance
scheduler = AsyncIOScheduler()


async def update_all_data():
    """
    Main update job that runs daily at 10am ET
    Updates odds, projections, and efficiency metrics for all tracked leagues
    """
    print(f"⏰ Starting daily update at {datetime.now()}")

    try:
        # Initialize services
        odds_service = OddsAPIService()
        nfl_service = NFLAPIService()
        projection_engine = ProjectionEngine(nfl_service)
        efficiency_calc = EfficiencyCalculator()
        matchup_odds_gen = MatchupOddsGenerator()

        # Get current week (would need to determine this properly)
        current_week = 10  # Placeholder
        current_season = 2024

        # Step 1: Fetch and store NFL odds
        print("📊 Fetching NFL odds...")
        team_odds_list = await odds_service.get_team_odds_by_week(current_week, current_season)

        for team_odds in team_odds_list:
            await db.execute(
                """
                INSERT OR REPLACE INTO team_odds
                (nfl_team, opponent, week, season, team_total_ou, spread, moneyline,
                 win_probability, game_time, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    team_odds.nfl_team,
                    team_odds.opponent,
                    team_odds.week,
                    team_odds.season,
                    team_odds.team_total_over_under,
                    team_odds.spread,
                    team_odds.moneyline,
                    team_odds.win_probability,
                    team_odds.game_time.isoformat(),
                    team_odds.updated_at.isoformat()
                )
            )

        print(f"✅ Stored {len(team_odds_list)} NFL team odds")

        # Step 2: Get all tracked leagues
        league_rows = await db.fetch_all("SELECT * FROM leagues")
        print(f"📋 Processing {len(league_rows)} leagues...")

        for league_row in league_rows:
            league_id = league_row["league_id"]
            scoring_type = league_row["scoring_type"]

            print(f"  Processing league: {league_row['name']}")

            # Get all teams in league
            team_rows = await db.fetch_all(
                "SELECT * FROM teams WHERE league_id = ?",
                (league_id,)
            )

            # Step 3: Calculate projections for each team
            # (In a real implementation, would fetch rosters and generate projections)
            # This is simplified for the structure

            # Step 4: Calculate efficiency metrics
            league_avg_ppg = 100.0  # Would calculate from actual league data
            weeks_remaining = 4  # Would calculate based on current week

            efficiencies = []
            for team_row in team_rows:
                # Create Team object
                from .models.league import Team
                team = Team(
                    team_id=team_row["team_id"],
                    league_id=team_row["league_id"],
                    name=team_row["name"],
                    manager_name=team_row["manager_name"],
                    wins=team_row["wins"],
                    losses=team_row["losses"],
                    ties=team_row["ties"],
                    points_for=team_row["points_for"],
                    points_against=team_row["points_against"]
                )

                # Calculate efficiency
                efficiency = await efficiency_calc.calculate_team_efficiency(
                    team,
                    current_week,
                    current_season,
                    league_avg_ppg,
                    [],  # Would pass all teams
                    weeks_remaining
                )
                efficiencies.append(efficiency)

            # Calculate league-wide rankings
            efficiencies = efficiency_calc.calculate_league_rankings(
                efficiencies,
                weeks_remaining
            )

            # Store efficiency metrics
            for eff in efficiencies:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO team_efficiency
                    (team_id, league_id, season, week, wins, losses, ties, win_percentage,
                     points_for, points_against, points_differential, avg_points_for,
                     avg_points_against, expected_wins, expected_losses,
                     expected_win_percentage, luck_factor, efficiency_rating,
                     strength_of_schedule, power_rank, record_rank, points_for_rank,
                     points_against_rank, playoff_probability, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        eff.team_id, eff.league_id, eff.season, eff.week,
                        eff.wins, eff.losses, eff.ties, eff.win_percentage,
                        eff.points_for, eff.points_against, eff.points_differential,
                        eff.avg_points_for, eff.avg_points_against,
                        eff.expected_wins, eff.expected_losses,
                        eff.expected_win_percentage, eff.luck_factor,
                        eff.efficiency_rating, eff.strength_of_schedule,
                        eff.power_rank, eff.record_rank, eff.points_for_rank,
                        eff.points_against_rank, eff.playoff_probability,
                        eff.updated_at.isoformat()
                    )
                )

        print("✅ Daily update complete!")

        # Close services
        await odds_service.close()
        await nfl_service.close()

    except Exception as e:
        print(f"❌ Error during daily update: {str(e)}")
        import traceback
        traceback.print_exc()


def start_scheduler():
    """Start the scheduler"""
    # Get schedule settings from environment
    schedule_hour = int(os.getenv("UPDATE_SCHEDULE_HOUR", "10"))
    schedule_minute = int(os.getenv("UPDATE_SCHEDULE_MINUTE", "0"))
    timezone_str = os.getenv("UPDATE_TIMEZONE", "America/New_York")
    timezone = pytz.timezone(timezone_str)

    # Add job to run daily at specified time
    scheduler.add_job(
        update_all_data,
        trigger=CronTrigger(
            hour=schedule_hour,
            minute=schedule_minute,
            timezone=timezone
        ),
        id="daily_update",
        name="Daily odds and projections update",
        replace_existing=True
    )

    # Start the scheduler
    scheduler.start()

    print(f"📅 Scheduler configured: Daily updates at {schedule_hour}:{schedule_minute:02d} {timezone_str}")


def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("🛑 Scheduler stopped")
