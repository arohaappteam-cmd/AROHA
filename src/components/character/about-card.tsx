import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutCard({ bio }: { bio: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardAction>
          <Link href="/character/edit#identity" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Edit
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {bio ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-pretty">{bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a few words about yourself — what you do, what matters to you, where you&apos;re headed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
