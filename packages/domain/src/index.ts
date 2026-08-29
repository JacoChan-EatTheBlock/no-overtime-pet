/**
 * @not/domain — Pure business rules (no side effects)
 * 
 * Contains:
 * - Scheduling solver (deterministic)
 * - Activity → PetAction mapping
 * - Nang Fee calculation formulas
 * - Overtime pool settlement logic
 */

export { calculateNangFeeRate, accrue, forfeit } from './nang-fee';
export { solveSchedule } from './scheduling';
export { mapActivityToPetAction } from './activity-mapping';
