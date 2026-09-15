"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

import { useActionRunner } from "./use-action-runner";

export type RoadmapItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: { title: string; description: string | null };
  onSubmit: (values: { title: string; description: string }) => Promise<ActionResult>;
};

/** Add/edit dialog for milestones and missions. Mount with a key to reset. */
export function RoadmapItemDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initial,
  onSubmit,
}: RoadmapItemDialogProps) {
  const [values, setValues] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });
  const { pending, error, run } = useActionRunner();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => onSubmit(values), () => onOpenChange(false));
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="roadmap-item-title">Title</Label>
            <Input
              id="roadmap-item-title"
              value={values.title}
              onChange={(event) => setValues((v) => ({ ...v, title: event.target.value }))}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roadmap-item-description">
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="roadmap-item-description"
              value={values.description}
              onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || values.title.trim().length < 2}>
              {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
