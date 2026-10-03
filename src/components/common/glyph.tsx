import {
  ArrowBigUpIcon,
  AwardIcon,
  BicepsFlexedIcon,
  BirdIcon,
  BookOpenIcon,
  BrainIcon,
  BriefcaseIcon,
  CameraIcon,
  CheckIcon,
  ChefHatIcon,
  CloudRainIcon,
  CloudSunIcon,
  CoinsIcon,
  CompassIcon,
  ConstructionIcon,
  CrownIcon,
  EarthIcon,
  FeatherIcon,
  FlagIcon,
  FlameIcon,
  FlaskConicalIcon,
  Flower2Icon,
  FootprintsIcon,
  GemIcon,
  HammerIcon,
  HandshakeIcon,
  HeartIcon,
  LandmarkIcon,
  LaptopIcon,
  LeafIcon,
  LibraryBigIcon,
  MessagesSquareIcon,
  MoonIcon,
  MountainIcon,
  MountainSnowIcon,
  MusicIcon,
  OrbitIcon,
  PackageIcon,
  PaletteIcon,
  PawPrintIcon,
  PenLineIcon,
  ScanFaceIcon,
  ScrollTextIcon,
  SearchIcon,
  SparkleIcon,
  SparklesIcon,
  SproutIcon,
  StarIcon,
  SunIcon,
  SunriseIcon,
  TargetIcon,
  TrendingUpIcon,
  TrophyIcon,
  WavesIcon,
  WindIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Catalogues and stored rows name their symbol with an emoji (skill trees,
 * achievements, challenges, life areas, moods…). The UI never shows the
 * emoji itself: each maps to a crisp SVG icon with its own colour, so
 * symbols look the same on every device and match the rest of the
 * interface. Stored data stays untouched — the emoji is just the key.
 */
type GlyphEntry = { icon: LucideIcon; tone: string };

const GLYPHS: Record<string, GlyphEntry> = {
  // Life areas & attributes
  "💪": { icon: BicepsFlexedIcon, tone: "text-rose-400" },
  "🧠": { icon: BrainIcon, tone: "text-sky-400" },
  "📚": { icon: LibraryBigIcon, tone: "text-amber-300" },
  "🤝": { icon: HandshakeIcon, tone: "text-pink-400" },
  "🎯": { icon: TargetIcon, tone: "text-violet-400" },
  "🎨": { icon: PaletteIcon, tone: "text-fuchsia-400" },
  "🌎": { icon: EarthIcon, tone: "text-cyan-400" },
  "🌍": { icon: EarthIcon, tone: "text-cyan-400" },
  "💼": { icon: BriefcaseIcon, tone: "text-blue-400" },
  "💰": { icon: CoinsIcon, tone: "text-yellow-300" },
  "🛠": { icon: HammerIcon, tone: "text-orange-300" },
  "❤": { icon: HeartIcon, tone: "text-rose-400" },
  "🌱": { icon: SproutIcon, tone: "text-emerald-400" },
  "🗣": { icon: MessagesSquareIcon, tone: "text-pink-300" },
  "✨": { icon: SparklesIcon, tone: "text-violet-300" },
  // Skills, projects, experiments
  "💻": { icon: LaptopIcon, tone: "text-sky-300" },
  "🎵": { icon: MusicIcon, tone: "text-fuchsia-300" },
  "📷": { icon: CameraIcon, tone: "text-indigo-300" },
  "✍": { icon: PenLineIcon, tone: "text-amber-200" },
  "📈": { icon: TrendingUpIcon, tone: "text-emerald-400" },
  "🍳": { icon: ChefHatIcon, tone: "text-orange-300" },
  "🧭": { icon: CompassIcon, tone: "text-teal-300" },
  "📦": { icon: PackageIcon, tone: "text-amber-400" },
  "🧘": { icon: Flower2Icon, tone: "text-violet-300" },
  "📖": { icon: BookOpenIcon, tone: "text-amber-300" },
  "🏃": { icon: FootprintsIcon, tone: "text-orange-400" },
  "🌿": { icon: LeafIcon, tone: "text-emerald-400" },
  "🧪": { icon: FlaskConicalIcon, tone: "text-cyan-300" },
  // Achievements & milestones
  "🌅": { icon: SunriseIcon, tone: "text-orange-300" },
  "📜": { icon: ScrollTextIcon, tone: "text-amber-200" },
  "🏛": { icon: LandmarkIcon, tone: "text-indigo-300" },
  "🏗": { icon: ConstructionIcon, tone: "text-orange-400" },
  "🔎": { icon: SearchIcon, tone: "text-sky-300" },
  "🪞": { icon: ScanFaceIcon, tone: "text-violet-300" },
  "🔥": { icon: FlameIcon, tone: "text-orange-400" },
  "🌋": { icon: MountainIcon, tone: "text-red-400" },
  "🏔": { icon: MountainSnowIcon, tone: "text-sky-300" },
  "⚡": { icon: ZapIcon, tone: "text-yellow-300" },
  "👑": { icon: CrownIcon, tone: "text-amber-300" },
  "🏆": { icon: TrophyIcon, tone: "text-amber-300" },
  "🚩": { icon: FlagIcon, tone: "text-rose-400" },
  "🌟": { icon: AwardIcon, tone: "text-amber-300" },
  "⬆": { icon: ArrowBigUpIcon, tone: "text-emerald-400" },
  "✓": { icon: CheckIcon, tone: "text-emerald-400" },
  // Moods
  "🌧": { icon: CloudRainIcon, tone: "text-slate-400" },
  "⛅": { icon: CloudSunIcon, tone: "text-sky-300" },
  "🌤": { icon: CloudSunIcon, tone: "text-amber-200" },
  "☀": { icon: SunIcon, tone: "text-amber-300" },
  // Avatar emblems
  "🌊": { icon: WavesIcon, tone: "text-sky-400" },
  "🌙": { icon: MoonIcon, tone: "text-indigo-300" },
  "⭐": { icon: StarIcon, tone: "text-amber-300" },
  "🍃": { icon: WindIcon, tone: "text-emerald-300" },
  "💎": { icon: GemIcon, tone: "text-cyan-300" },
  "🦉": { icon: FeatherIcon, tone: "text-amber-200" },
  "🐺": { icon: PawPrintIcon, tone: "text-slate-300" },
  "🦅": { icon: BirdIcon, tone: "text-sky-300" },
  "🪐": { icon: OrbitIcon, tone: "text-violet-300" },
};

const FALLBACK: GlyphEntry = { icon: SparkleIcon, tone: "text-violet-300" };

/** Variation selectors and joiners don't change which symbol is meant. */
function normalise(emoji: string): string {
  return emoji.replace(/[︎️‍]/g, "").trim();
}

export function glyphFor(emoji: string | null | undefined): GlyphEntry {
  return (emoji && GLYPHS[normalise(emoji)]) || FALLBACK;
}

/**
 * Renders a catalogue symbol as an icon sized to the surrounding text
 * (1em), so it drops in wherever the emoji used to sit. Decorative: the
 * label next to it carries the meaning.
 */
export function Glyph({ emoji, className, plain = false }: { emoji: string | null | undefined; className?: string; plain?: boolean }) {
  const { icon: Icon, tone } = glyphFor(emoji);
  return <Icon aria-hidden className={cn("inline-block size-[1em] shrink-0 align-[-0.125em]", !plain && tone, className)} />;
}
