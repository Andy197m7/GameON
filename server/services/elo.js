/**
 * Elo rating system — same formula used by FIDE chess.
 * K-factor: 32 for players with <20 matches, 16 for established players.
 */

const K_NEW = 32;
const K_ESTABLISHED = 16;
const ESTABLISHED_THRESHOLD = 20;
const DEFAULT_ELO = 1200;

/**
 * Expected score for player A against player B.
 * Returns a probability between 0 and 1.
 */
function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate new Elo ratings after a match.
 * @param {number} eloWinner
 * @param {number} eloLoser
 * @param {number} winnerMatches - total matches played by winner before this match
 * @param {number} loserMatches  - total matches played by loser before this match
 * @returns {{ newWinnerElo: number, newLoserElo: number, winnerDelta: number, loserDelta: number }}
 */
function calculateElo(eloWinner, eloLoser, winnerMatches, loserMatches) {
  const kWinner = winnerMatches < ESTABLISHED_THRESHOLD ? K_NEW : K_ESTABLISHED;
  const kLoser  = loserMatches  < ESTABLISHED_THRESHOLD ? K_NEW : K_ESTABLISHED;

  const expectedWinner = expectedScore(eloWinner, eloLoser);
  const expectedLoser  = expectedScore(eloLoser, eloWinner);

  const winnerDelta = Math.round(kWinner * (1 - expectedWinner));
  const loserDelta  = Math.round(kLoser  * (0 - expectedLoser));

  return {
    newWinnerElo: eloWinner + winnerDelta,
    newLoserElo:  eloLoser  + loserDelta,
    winnerDelta,
    loserDelta,
  };
}

/**
 * Find players within ±band Elo of a target rating.
 * Band widens progressively if no match found.
 */
function eloMatchBand(attempt = 0) {
  // Start at ±100, widen by 50 every 30 seconds up to ±300
  return Math.min(100 + attempt * 50, 300);
}

module.exports = { calculateElo, eloMatchBand, DEFAULT_ELO };
