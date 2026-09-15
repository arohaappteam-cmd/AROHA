import { describe, expect, it } from "vitest";

import { evolutionForTier, initialsFor, toAppearance } from "./avatar";
import { interestSlug } from "./interests";
import { focusAreas, LIFE_AREA_LIST, resolveLifeAreas } from "./life-areas";
import { lifeAreasSchema, preferencesSchema, profileSchema } from "./schemas";
import { getSetupState } from "./setup";
import { greetingFor, hourInTimezone, matchTimezone } from "./timezones";

describe("life areas", () => {
  it("lists all twelve areas with five core", () => {
    expect(LIFE_AREA_LIST).toHaveLength(12);
    expect(LIFE_AREA_LIST.filter((a) => a.core).map((a) => a.key)).toEqual([
      "PHYSICAL",
      "MENTAL",
      "LEARNING",
      "SOCIAL",
      "PERSONAL_GOAL",
    ]);
  });

  it("keeps core areas active and ignores focus on inactive areas", () => {
    const areas = resolveLifeAreas([
      { lifeArea: "PHYSICAL", isActive: false, isFocus: true, focusRank: 2, intention: "Run a 10k" },
      { lifeArea: "FINANCE", isActive: false, isFocus: true, focusRank: 1, intention: null },
      { lifeArea: "CREATIVITY", isActive: true, isFocus: true, focusRank: 1, intention: null },
    ]);
    const byKey = Object.fromEntries(areas.map((a) => [a.key, a]));

    expect(byKey.PHYSICAL).toMatchObject({ isActive: true, isFocus: true, intention: "Run a 10k" });
    expect(byKey.FINANCE).toMatchObject({ isActive: false, isFocus: false, focusRank: null });
    expect(byKey.CAREER).toMatchObject({ isActive: false, isFocus: false });
    expect(focusAreas(areas).map((a) => a.key)).toEqual(["CREATIVITY", "PHYSICAL"]);
  });
});

describe("lifeAreasSchema", () => {
  const area = (lifeArea: string, isFocus = false, isActive = true) => ({
    lifeArea,
    isActive,
    isFocus,
    intention: "",
  });

  it("allows up to three focus areas and blanks intentions to null", () => {
    const parsed = lifeAreasSchema.parse([area("PHYSICAL", true), area("CAREER", true), area("MENTAL", true)]);
    expect(parsed[0].intention).toBeNull();
  });

  it("rejects more than three focus areas", () => {
    const result = lifeAreasSchema.safeParse([
      area("PHYSICAL", true),
      area("CAREER", true),
      area("MENTAL", true),
      area("SOCIAL", true),
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects focus on an inactive non-core area", () => {
    expect(lifeAreasSchema.safeParse([area("FINANCE", true, false)]).success).toBe(false);
    expect(lifeAreasSchema.safeParse([area("PHYSICAL", true, false)]).success).toBe(true);
  });

  it("rejects duplicates and unknown areas", () => {
    expect(lifeAreasSchema.safeParse([area("PHYSICAL"), area("PHYSICAL")]).success).toBe(false);
    expect(lifeAreasSchema.safeParse([area("HOBBIES")]).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("trims and nulls optional fields", () => {
    expect(
      profileSchema.parse({ displayName: "  Priya  ", pronouns: " ", bio: "", timezone: "Asia/Kolkata" }),
    ).toEqual({ displayName: "Priya", pronouns: null, bio: null, timezone: "Asia/Kolkata" });
  });

  it("requires a name and a real timezone", () => {
    expect(profileSchema.safeParse({ displayName: " ", timezone: "UTC" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Sam", timezone: "Mars/Olympus" }).success).toBe(false);
  });
});

describe("preferencesSchema", () => {
  it("accepts listed durations and de-duplicates choices", () => {
    const parsed = preferencesSchema.parse({
      dailyMinutes: 45,
      preferredTimeOfDay: "MORNING",
      challengeLevel: "GENTLE",
      movementOptions: ["WALKING", "WALKING", "GYM"],
      learningFormats: [],
    });
    expect(parsed.movementOptions).toEqual(["WALKING", "GYM"]);
  });

  it("rejects arbitrary durations", () => {
    expect(
      preferencesSchema.safeParse({
        dailyMinutes: 1000,
        preferredTimeOfDay: "MORNING",
        challengeLevel: "GENTLE",
        movementOptions: [],
        learningFormats: [],
      }).success,
    ).toBe(false);
  });
});

describe("interestSlug", () => {
  it("treats case, spacing and punctuation as equivalent", () => {
    expect(interestSlug("Rock  Climbing")).toBe("rock-climbing");
    expect(interestSlug("rock-climbing!")).toBe("rock-climbing");
    expect(interestSlug("Café culture")).toBe("cafe-culture");
    expect(interestSlug("日本語")).toBe("日本語");
    expect(interestSlug("!!!")).toBe("");
  });
});

describe("avatar", () => {
  it("falls back to defaults for unknown stored keys", () => {
    expect(toAppearance({ avatarStyle: "CREST", avatarColor: "neon", avatarEmblem: "dragon" })).toEqual({
      style: "CREST",
      color: "violet",
      emblem: "sprout",
    });
  });

  it("evolves visibly with each tier", () => {
    expect(evolutionForTier("Beginner").rings).toBe(0);
    expect(evolutionForTier("Master")).toMatchObject({ rings: 3, glow: true });
  });

  it("builds initials", () => {
    expect(initialsFor("Maya Rivera Lopez")).toBe("ML");
    expect(initialsFor("sam")).toBe("S");
    expect(initialsFor("  ")).toBe("?");
  });
});

describe("setup state", () => {
  it("counts completed steps", () => {
    const state = getSetupState({
      profileSaved: true,
      characterCustomized: false,
      interestCount: 3,
      focusCount: 0,
      preferencesSaved: true,
    });
    expect(state).toMatchObject({ completed: 3, total: 5, isComplete: false });
  });
});

describe("timezones", () => {
  it("computes the local hour and greeting", () => {
    const date = new Date("2026-09-13T06:30:00Z");
    expect(hourInTimezone(date, "Asia/Kolkata")).toBe(12);
    expect(hourInTimezone(date, "Invalid/Zone")).toBe(6);
    expect(greetingFor(8)).toBe("Good morning");
    expect(greetingFor(20)).toBe("Good evening");
  });

  it("matches legacy aliases to the listed timezone", () => {
    expect(matchTimezone("Asia/Calcutta", ["UTC", "Asia/Kolkata"])).toBe("Asia/Kolkata");
    expect(matchTimezone("Asia/Kolkata", ["UTC", "Asia/Calcutta"])).toBe("Asia/Calcutta");
    expect(matchTimezone("Europe/Paris", ["Europe/Paris"])).toBe("Europe/Paris");
    expect(matchTimezone("Not/AZone", ["UTC"])).toBe("Not/AZone");
  });
});
