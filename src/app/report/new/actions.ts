"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReportFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function submitConditionReport(
  _prev: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You need to be signed in to submit a report." };
  }

  const courseId = formData.get("course_id") as string;
  const playedAt = formData.get("played_at") as string; // datetime-local string

  const toNumberOrNull = (key: string) => {
    const raw = formData.get(key);
    if (!raw || raw === "") return null;
    return Number(raw);
  };

  const green_speed = toNumberOrNull("green_speed");
  const firmness = toNumberOrNull("firmness");
  const bunker_rating = toNumberOrNull("bunker_rating");
  const fairway_rating = toNumberOrNull("fairway_rating");
  const pace_minutes = toNumberOrNull("pace_minutes");
  const notes = (formData.get("notes") as string) || null;
  const photo_url = (formData.get("photo_url") as string) || null;

  // Mirror the DB's "at least one rating" constraint here so the
  // user gets a friendly message instead of a raw Postgres error.
  if (
    green_speed === null &&
    firmness === null &&
    bunker_rating === null &&
    fairway_rating === null &&
    pace_minutes === null
  ) {
    return { status: "error", message: "Rate at least one thing about the course." };
  }

  if (!courseId) {
    return { status: "error", message: "Missing course." };
  }

  if (!playedAt) {
    return { status: "error", message: "Let us know when you played." };
  }

  // Mirror the DB's freshness trigger client-side too, so the error
  // shows up next to the date field instead of as a failed request.
  const playedDate = new Date(playedAt);
  const now = new Date();
  const hoursSince = (now.getTime() - playedDate.getTime()) / 1000 / 60 / 60;

  if (hoursSince < 0) {
    return { status: "error", message: "That's in the future — pick a real tee time." };
  }
  if (hoursSince > 24) {
    return { status: "error", message: "Reports have to be from the last 24 hours to keep conditions current." };
  }

  const { error } = await supabase.from("condition_reports").insert({
    course_id: courseId,
    user_id: user.id,
    played_at: playedDate.toISOString(),
    green_speed,
    firmness,
    bunker_rating,
    fairway_rating,
    pace_minutes,
    notes,
    photo_url,
  });

  if (error) {
    // Most likely the one-report-per-course-per-day unique constraint.
    if (error.code === "23505") {
      return { status: "error", message: "You've already reported on this course today." };
    }
    return { status: "error", message: "Something went wrong submitting your report. Try again." };
  }

  revalidatePath(`/courses/${courseId}`);
  return { status: "success", message: "Report submitted. Thanks for keeping conditions current." };
}