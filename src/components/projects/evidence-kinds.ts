import { CodeIcon, FileTextIcon, ImageIcon, LinkIcon, StickyNoteIcon, type LucideIcon } from "lucide-react";

import type { EvidenceKind } from "@/generated/prisma/enums";

/** How each kind of evidence looks and what it asks for. */
export const EVIDENCE_KINDS: Record<EvidenceKind, { label: string; icon: LucideIcon; placeholder: string }> = {
  LINK: { label: "Live link", icon: LinkIcon, placeholder: "https://my-app.example.com" },
  REPOSITORY: { label: "Code", icon: CodeIcon, placeholder: "https://github.com/me/project" },
  DOCUMENT: { label: "Document", icon: FileTextIcon, placeholder: "https://docs.google.com/…" },
  MEDIA: { label: "Photos, audio, video", icon: ImageIcon, placeholder: "https://…" },
  NOTE: { label: "Written note", icon: StickyNoteIcon, placeholder: "Optional link" },
};
