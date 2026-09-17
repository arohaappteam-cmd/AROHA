import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { DayRecord } from "@/components/reflection/day-record";
import { ReflectionForm } from "@/components/reflection/reflection-form";
import { ReflectionSummary } from "@/components/reflection/reflection-summary";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDateOnly, formatDateOnly, parseDateOnly } from "@/modules/goals/dates";
import { REFLECTION_QUESTIONS } from "@/modules/reflection/reflection";
import { getCurrentUser } from "@/server/auth/current-user";
import { getReflectionDay } from "@/server/services/reflection.service";

export const metadata: Metadata = { title: "Reflect" };

const shift = (date: string, days: number) => formatDateOnly(new Date(parseDateOnly(date).getTime() + days * 86_400_000));

export default async function ReflectPage(props: PageProps<"/journal/reflect">) {
  await connection();
  const { date } = await props.searchParams;
  const user = await getCurrentUser();
  const day = await getReflectionDay(user, typeof date === "string" ? date : undefined);
  const reflection = day.reflection;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/journal" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Journal
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">End of day</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{day.isToday ? "How was today?" : displayDateOnly(day.date)}</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            A minute to notice what happened. Your answers shape tomorrow&apos;s quests — a rough day means a gentler start.
          </p>
        </div>
        <nav aria-label="Choose a day" className="flex items-center gap-1">
          <Link href={`/journal/reflect?date=${shift(day.date, -1)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Previous day">
            <ChevronLeftIcon />
          </Link>
          {!day.isToday && (
            <>
              <Link href={`/journal/reflect?date=${shift(day.date, 1)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Next day">
                <ChevronRightIcon />
              </Link>
              <Link href="/journal/reflect" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Today
              </Link>
            </>
          )}
        </nav>
      </header>

      {reflection && <ReflectionSummary reflection={reflection} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Reflection</CardTitle>
            <CardDescription>{day.editable ? "Private to you. Used to summarise your day and tune tomorrow." : "This day is part of your record now."}</CardDescription>
          </CardHeader>
          <CardContent>
            {day.editable ? (
              <ReflectionForm
                key={`${day.date}-${reflection?.updatedAt.toISOString() ?? "new"}`}
                date={day.date}
                saved={reflection !== null}
                initial={{
                  mood: reflection?.mood ?? null,
                  learned: reflection?.learned,
                  wentWell: reflection?.wentWell,
                  difficult: reflection?.difficult,
                  proud: reflection?.proud,
                  differently: reflection?.differently,
                }}
              />
            ) : reflection ? (
              <dl className="space-y-4">
                {REFLECTION_QUESTIONS.filter((question) => reflection[question.key]).map((question) => (
                  <div key={question.key}>
                    <dt className="text-sm font-medium">{question.label}</dt>
                    <dd className="text-sm whitespace-pre-line text-muted-foreground">{reflection[question.key]}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No reflection was written for this day.</p>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>{day.isToday ? "Today's journey" : "That day's journey"}</CardTitle>
          </CardHeader>
          <CardContent>
            <DayRecord day={day} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
