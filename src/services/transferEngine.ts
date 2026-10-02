import type { ContractType, GameState, SportType, TransferOffer } from '../types/game';
import { poolFor } from '../data/clubs';
import { DIVISION_SALARY, DIVISION_STRENGTH, PRO_DIVISION_FROM, topDivision } from '../data/sports';
import { getAgent } from '../data/agents';
import { averageRating, calcOvr, clamp, randFloat, randInt, shuffle } from './playerUtils';

export function contractForDivision(sport: SportType, division: number): ContractType {
  const pro = PRO_DIVISION_FROM[sport];
  if (division >= pro) return 'pro';
  if (division === pro - 1) return 'semi';
  return 'amateur';
}

export function baseSalary(sport: SportType, division: number): number {
  return DIVISION_SALARY[sport][division] ?? DIVISION_SALARY[sport][0];
}

/**
 * Generates transfer / contract offers. Interest grows with OVR, form, fan reputation
 * and the agent's level. An agent push adds one more offer and reaches higher.
 */
export function generateOffers(state: GameState): TransferOffer[] {
  const { player, flags } = state;
  const sport = player.sport;
  const ovr = calcOvr(player);
  const agent = getAgent(player.agentId);
  const agentLevel = agent?.level ?? 0;
  const form = averageRating(player.seasonStats) || 6;
  const interest = ovr + (form - 6.5) * 2.5 + (player.fanRep - 50) * 0.05 + agentLevel * 1.5 + (flags.transferPush ? 2 : 0) + Math.min(4, player.national.caps);

  // A two-division jump needs a strong agent who is actively pushing, and only in the summer.
  const bigJump = state.transferContext === 'endseason' && agentLevel >= 2 && flags.transferPush;
  const maxDiv = Math.min(topDivision(sport), player.division + (bigJump ? 2 : 1));
  const candidates: number[] = [];
  for (let d = player.division; d <= maxDiv; d++) {
    // Same-level clubs are easy to interest; higher leagues need the player to be ready.
    const needed = DIVISION_STRENGTH[sport][d] - (d === player.division ? 6 : 1);
    if (interest >= needed) candidates.push(d);
  }
  if (candidates.length === 0) return [];

  let count = 1 + (Math.random() < 0.5 ? 1 : 0) + (agentLevel >= 2 ? 1 : 0) + (flags.transferPush ? 1 : 0);
  if (interest < DIVISION_STRENGTH[sport][player.division]) count = Math.min(count, 1);
  count = clamp(count, 1, 4);

  const offers: TransferOffer[] = [];
  const usedClubs = new Set<string>([player.club]);
  for (let i = 0; i < count; i++) {
    // Prefer the highest divisions that are interested, but keep variety.
    const division = candidates[Math.max(0, candidates.length - 1 - (i % candidates.length))];
    const club = shuffle(poolFor(sport, division)).find((name) => !usedClubs.has(name));
    if (!club) continue;
    usedClubs.add(club);
    const strength = DIVISION_STRENGTH[sport][division] + randInt(-5, 5);
    const salary = Math.round((baseSalary(sport, division) * randFloat(0.85, 1.25) * (1 + agentLevel * 0.1)) / 10) * 10;
    offers.push({
      id: `offer_${Date.now()}_${i}`,
      club,
      division,
      contract: contractForDivision(sport, division),
      weeklySalary: salary,
      signingBonus: Math.round((salary * randFloat(1.5, 3)) / 50) * 50,
      role: ovr >= strength + 2 ? 'starter' : 'rotation',
      strength,
    });
  }
  return offers.sort((a, b) => b.division - a.division || b.weeklySalary - a.weeklySalary);
}
