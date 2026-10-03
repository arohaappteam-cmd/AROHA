"use client";

import { ArrowRightIcon, CheckIcon, LoaderCircleIcon, SendIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useActionRunner } from "@/components/goals/use-action-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MENTORSHIP_MESSAGE, MAX_MENTORSHIP_NOTE } from "@/modules/social/schemas";
import {
  endMentorshipAction,
  requestMentorshipAction,
  respondMentorshipAction,
  sendMentorshipNoteAction,
} from "@/server/actions/social.actions";

/**
 * Asking someone to mentor you, or offering to mentor someone. The request
 * reaches them on their Mentorship page; nothing starts until they accept.
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
        {name} will see your request and your note, and can accept or decline. Your email is never shared.
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

/** Accept or decline a request someone sent the viewer. */
export function RespondButtons({ mentorshipId }: { mentorshipId: string }) {
  const { pending, error, run } = useActionRunner();
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => respondMentorshipAction({ mentorshipId, accept: true }))}>
          {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
          Accept
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => respondMentorshipAction({ mentorshipId, accept: false }))}>
          <XIcon data-icon="inline-start" />
          Decline
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Closes an active mentorship, or withdraws a request still waiting. */
export function EndMentorshipButton({ mentorshipId, label = "Close this mentorship" }: { mentorshipId: string; label?: string }) {
  const { pending, error, run } = useActionRunner();
  return (
    <div className="space-y-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => endMentorshipAction(mentorshipId))}>
        {pending && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** One note to the other member. Deliberate and short — not a chat box. */
export function MentorshipNoteForm({ mentorshipId, name }: { mentorshipId: string; name: string }) {
  const { pending, error, run } = useActionRunner();
  const [body, setBody] = useState("");

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => sendMentorshipNoteAction({ mentorshipId, body }), () => setBody(""));
      }}
    >
      <Label htmlFor="note" className="sr-only">
        Note to {name}
      </Label>
      <Textarea
        id="note"
        rows={3}
        maxLength={MAX_MENTORSHIP_NOTE}
        placeholder={`A note to ${name} — what you did, what you're stuck on, when to talk next.`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {body.length}/{MAX_MENTORSHIP_NOTE}
        </span>
        <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
          {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SendIcon data-icon="inline-start" />}
          Send note
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
