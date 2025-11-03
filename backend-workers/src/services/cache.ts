/**
 * Caching service using Cloudflare Workers KV
 * Helps reduce API calls and improve response times
 */
export class CacheService {
  private kv: KVNamespace;
  private defaultTTL = 3600; // 1 hour default

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.kv.get(key, 'json');
      return cached as T | null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl,
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    // KV doesn't support wildcard deletes, so we'd need to list keys first
    // For now, just a placeholder
    console.log(`Would delete keys matching: ${pattern}`);
  }

  // Helper methods for common cache keys
  generateLeagueKey(leagueId: string): string {
    return `league:${leagueId}`;
  }

  generateMatchupOddsKey(leagueId: string, week: number, season: number): string {
    return `matchup_odds:${leagueId}:${week}:${season}`;
  }

  generateNFLOddsKey(week: number, season: number): string {
    return `nfl_odds:${week}:${season}`;
  }

  generateEfficiencyKey(leagueId: string, week: number, season: number): string {
    return `efficiency:${leagueId}:${week}:${season}`;
  }
}
