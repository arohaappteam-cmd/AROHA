import type {
  ChallengeLevel,
  LearningFormat,
  MovementOption,
  TimeOfDay,
} from "@/generated/prisma/enums";

export const DAILY_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export const TIME_OF_DAY_OPTIONS = [
  { key: "EARLY_MORNING", label: "Early morning" },
  { key: "MORNING", label: "Morning" },
  { key: "AFTERNOON", label: "Afternoon" },
  { key: "EVENING", label: "Evening" },
  { key: "FLEXIBLE", label: "Flexible" },
] as const satisfies readonly { key: TimeOfDay; label: string }[];

export const CHALLENGE_LEVEL_OPTIONS = [
  { key: "GENTLE", label: "Gentle", description: "Small, sustainable steps. Good for busy or low-energy seasons." },
  { key: "BALANCED", label: "Balanced", description: "Achievable days with a little stretch." },
  { key: "AMBITIOUS", label: "Ambitious", description: "Push harder when you have the time and energy." },
] as const satisfies readonly { key: ChallengeLevel; label: string; description: string }[];

export const MOVEMENT_OPTIONS = [
  { key: "GYM", label: "Gym" },
  { key: "HOME_WORKOUT", label: "Home workouts" },
  { key: "WALKING", label: "Walking" },
  { key: "RUNNING", label: "Running" },
  { key: "CYCLING", label: "Cycling" },
  { key: "SPORTS", label: "Sports" },
  { key: "YOGA_MOBILITY", label: "Yoga & mobility" },
  { key: "OUTDOORS", label: "Outdoor activities" },
] as const satisfies readonly { key: MovementOption; label: string }[];

export const LEARNING_FORMAT_OPTIONS = [
  { key: "READING", label: "Reading" },
  { key: "VIDEO", label: "Videos" },
  { key: "AUDIO", label: "Podcasts & audio" },
  { key: "HANDS_ON", label: "Hands-on practice" },
  { key: "COURSES", label: "Structured courses" },
  { key: "AI_LESSONS", label: "Short AI lessons" },
] as const satisfies readonly { key: LearningFormat; label: string }[];

export type Preferences = {
  dailyMinutes: number;
  preferredTimeOfDay: TimeOfDay;
  challengeLevel: ChallengeLevel;
  movementOptions: MovementOption[];
  learningFormats: LearningFormat[];
};

export const DEFAULT_PREFERENCES: Preferences = {
  dailyMinutes: 60,
  preferredTimeOfDay: "FLEXIBLE",
  challengeLevel: "BALANCED",
  movementOptions: [],
  learningFormats: [],
};

export function labelFor<K extends string>(
  options: readonly { key: K; label: string }[],
  key: K,
): string {
  return options.find((option) => option.key === key)?.label ?? key;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
