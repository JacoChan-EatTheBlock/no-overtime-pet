import { ActivityType, PetAction } from '@not/contracts';

/**
 * Map detected desktop activity to pet action.
 * Pure function — no side effects.
 */
export function mapActivityToPetAction(activity: ActivityType): PetAction {
  switch (activity) {
    case ActivityType.TYPING:
      return PetAction.TYPING;
    case ActivityType.MEETING:
      return PetAction.MEETING;
    case ActivityType.BROWSING:
      return PetAction.BROWSING;
    case ActivityType.IDLE:
      return PetAction.SUSPICIOUS_IDLE;
    case ActivityType.AWAY:
      return PetAction.AWAY;
    case ActivityType.BREAK:
      return PetAction.IDLE;
    default:
      return PetAction.IDLE;
  }
}
