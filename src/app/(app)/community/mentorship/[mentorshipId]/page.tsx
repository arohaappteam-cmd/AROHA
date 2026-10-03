import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PageHeader } from "@/components/common/page-header";
import { CommunityTabs } from "@/components/social/community-chrome";
import { EndMentorshipButton, MentorshipNoteForm } from "@/components/social/mentorship";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/current-user";
import { getMentorshipThread } from "@/server/services/social.service";

export const metadata: Metadata = { title: "Mentorship notes" };

const timeFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The notes two members leave each other. Only those two can open this page. */
export default async function MentorshipThreadPage(props: PageProps<"/community/mentorship/[mentorshipId]">) {
  await connection();
  const { mentorshipId } = await props.params;
  const user = await getCurrentUser();
  const thread = await getMentorshipThread(user, mentorshipId);
  if (!thread) notFound();

  const { mentorship, messages } = thread;
  const name = mentorship.counterpart.displayName;
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={mentorship.role === "MENTEE" ? "Your mentor" : "Someone you mentor"}
        title={name}
        description={`About ${mentorship.topic}. Notes here are seen only by the two of you.`}
        actions={
          <Link href="/community/mentorship" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" aria-hidden />
            All mentorships
          </Link>
        }
      />
      <CommunityTabs active="/community/mentorship" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Notes
            <Badge variant={mentorship.status === "ACTIVE" ? "secondary" : "outline"}>{mentorship.status === "ACTIVE" ? "Active" : "Closed"}</Badge>
          </CardTitle>
          <CardDescription>
            Short and deliberate — what you did, what you&apos;re stuck on, when to talk next. Refresh to see new notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes yet. {mentorship.role === "MENTEE" ? `Start by telling ${firstName} where you are today.` : `Start by asking ${firstName} what they've already tried.`}
            </p>
          ) : (
            <ol className="space-y-3">
              {messages.map((message) => (
                <li key={message.id} className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2", message.mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="text-sm whitespace-pre-wrap text-pretty">{message.body}</p>
                    <p className={cn("mt-1 text-[11px]", message.mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {message.mine ? "You" : firstName} · {timeFormat.format(message.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {thread.canWrite ? (
            <div className="border-t pt-4">
              <MentorshipNoteForm mentorshipId={mentorship.id} name={firstName} />
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">This mentorship is closed, so no new notes can be added.</p>
          )}
        </CardContent>
      </Card>

      {mentorship.status === "ACTIVE" && <EndMentorshipButton mentorshipId={mentorship.id} />}
    </div>
  );
}
