"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/error-state";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="AROHA couldn't load this page"
      description={
        process.env.NODE_ENV === "development"
          ? error.message
          : "This is usually temporary. Check that the database is running, then try again."
      }
      digest={error.digest}
      onRetry={retry}
    />
  );
}
