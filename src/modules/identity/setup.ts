export type SetupStepKey =
  | "identity"
  | "avatar"
  | "interests"
  | "focus"
  | "preferences";

export type SetupStep = {
  key: SetupStepKey;
  label: string;
  done: boolean;
  /** Anchor on the customize page. */
  href: string;
};

export type SetupState = {
  steps: SetupStep[];
  completed: number;
  total: number;
  isComplete: boolean;
};

export const MIN_INTERESTS_FOR_SETUP = 3;

/**
 * Character setup progress, derived from what the user has actually saved.
 * Nothing here is stored; completing steps is just filling in the profile.
 */
export function getSetupState(input: {
  profileSaved: boolean;
  characterCustomized: boolean;
  interestCount: number;
  focusCount: number;
  preferencesSaved: boolean;
}): SetupState {
  const steps: SetupStep[] = [
    {
      key: "identity",
      label: "Tell AROHA who you are",
      done: input.profileSaved,
      href: "/character/edit#identity",
    },
    {
      key: "avatar",
      label: "Design your avatar",
      done: input.characterCustomized,
      href: "/character/edit#avatar",
    },
    {
      key: "interests",
      label: `Add ${MIN_INTERESTS_FOR_SETUP} interests`,
      done: input.interestCount >= MIN_INTERESTS_FOR_SETUP,
      href: "/character/edit#interests",
    },
    {
      key: "focus",
      label: "Choose your current focus",
      done: input.focusCount > 0,
      href: "/character/edit#life-areas",
    },
    {
      key: "preferences",
      label: "Set your preferences",
      done: input.preferencesSaved,
      href: "/character/edit#preferences",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    isComplete: completed === steps.length,
  };
}
