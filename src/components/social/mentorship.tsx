"use client";

import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENTORSHIP_MESSAGE } from "@/modules/social/schemas";
import { endMentorshipAction, requestMentorshipAction } from "@/server/actions/social.actions";

/**
 * Asking someone to mentor you, or offering to mentor someone. In this
 * preview the other side is sample data, so the form says plainly that no
 * message is delivered — what's recorded is the user's own intent and plan.
 */
export function MentorshipRequestForm({
  handle,
  name,
  role,
  topics,
  onDone,
}: {
  handle: string;
  name: string;
  role: "MENTEE" | "MENTOR";
  topics: string[];
  onDone?: () => void;
}) {
  const { pending, error, run } = useActionRunner();
  const [topic, setTopic] = useState(topics[0] ?? "");
  const [message, setMessage] = useState("");

  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => requestMentorshipAction({ handle, role, topic, message: message.trim() || null }), onDone);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`topic-${handle}`}>{role === "MENTEE" ? `What would you like ${name}'s help with?` : `What can you help ${name} with?`}</Label>
        <Input id={`topic-${handle}`} value={topic} maxLength={80} required onChange={(event) => setTopic(event.target.value)} />
        {topics.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topics.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTopic(suggestion)}
                className="rounded-lg border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`message-${handle}`}>
          A note <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`message-${handle}`}
          rows={3}
          maxLength={MAX_MENTORSHIP_MESSAGE}
          placeholder={role === "MENTEE" ? "Where you are now, and what you're stuck on." : "What you've done in this area, and how you'd help."}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {name} is a sample member, so nothing is sent. The mentorship is recorded on your side with a starting plan.
      </p>

      <Button type="submit" size="sm" disabled={pending || topic.trim().length === 0}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        {role === "MENTEE" ? "Ask for mentorship" : "Offer to mentor"}
        <ArrowRightIcon data-icon="inline-end" />
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** Reveals the request form only when asked — no form shouting from a card. */
export function MentorshipRequestToggle(props: {
  handle: string;
  name: string;
  role: "MENTEE" | "MENTOR";
  topics: string[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {props.label}
      </Button>
    );
  }
  return <MentorshipRequestForm {...props} onDone={() => setOpen(false)} />;
}

export function EndMentorshipButton({ mentorshipId }: { mentorshipId: string }) {
  const { pending, error, run } = useActionRunner();
  return (
    <div className="space-y-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => endMentorshipAction(mentorshipId))}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        Close this mentorship
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
