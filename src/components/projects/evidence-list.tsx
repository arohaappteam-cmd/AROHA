"use client";

import { ExternalLinkIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EvidenceKind } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { addEvidenceAction, deleteEvidenceAction } from "@/server/actions/project.actions";

import { EVIDENCE_KINDS } from "./evidence-kinds";

type Evidence = { id: string; kind: EvidenceKind; title: string; url: string | null; note: string | null; createdAt: Date };

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export function EvidenceList({ projectId, evidence }: { projectId: string; evidence: Evidence[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [adding, setAdding] = useState(evidence.length === 0);
  const [form, setForm] = useState<{ kind: EvidenceKind; title: string; url: string; note: string }>({ kind: "LINK", title: "", url: "", note: "" });
  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors?.[field]?.[0] : undefined);

  const act = (action: () => Promise<ActionResult>, onOk?: () => void) =>
    startTransition(async () => {
      const next = await action();
      setResult(next);
      if (next.ok) onOk?.();
    });

  return (
    <div className="space-y-3">
      {evidence.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {evidence.map((item) => {
            const Icon = EVIDENCE_KINDS[item.kind].icon;
            return (
              <li key={item.id} className="group flex items-start gap-3 rounded-xl border bg-card p-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-xs text-primary hover:underline"
                    >
                      <span className="truncate">{item.url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                    </a>
                  )}
                  {item.note && <p className="line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">{item.note}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {EVIDENCE_KINDS[item.kind].label} · {dateFormat.format(new Date(item.createdAt))}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => deleteEvidenceAction(item.id))}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                  aria-label={`Remove “${item.title}”`}
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <form
          className="space-y-3 rounded-xl border border-dashed p-4"
          onSubmit={(event) => {
            event.preventDefault();
            act(
              () => addEvidenceAction({ projectId, ...form }),
              () => {
                setForm({ kind: form.kind, title: "", url: "", note: "" });
                setAdding(false);
              },
            );
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EVIDENCE_KINDS) as EvidenceKind[]).map((kind) => {
              const Icon = EVIDENCE_KINDS[kind].icon;
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={form.kind === kind}
                  onClick={() => setForm((current) => ({ ...current, kind }))}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    form.kind === kind ? "border-primary bg-primary/10 font-medium text-primary" : "hover:border-primary/50",
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {EVIDENCE_KINDS[kind].label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evidence-title">Title</Label>
              <Input
                id="evidence-title"
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Live demo, Final recording"
              />
              {fieldError("title") && <p className="text-xs text-destructive">{fieldError("title")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-url">Link</Label>
              <Input
                id="evidence-url"
                type="url"
                maxLength={500}
                value={form.url}
                onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                placeholder={EVIDENCE_KINDS[form.kind].placeholder}
              />
              {fieldError("url") && <p className="text-xs text-destructive">{fieldError("url")}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evidence-note">{form.kind === "NOTE" ? "What you made and how" : "Note (optional)"}</Label>
            <Textarea
              id="evidence-note"
              rows={form.kind === "NOTE" ? 4 : 2}
              maxLength={1000}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save evidence
            </Button>
            {evidence.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" />
          Add evidence
        </Button>
      )}

      {result && !result.ok && !result.fieldErrors?.title && !result.fieldErrors?.url && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
