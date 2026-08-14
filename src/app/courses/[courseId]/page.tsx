import { createClient } from "@/lib/supabase/server";
import { ConditionScoreCard } from "@/components/ConditionScoreCard";
import { ConditionReportCard } from "@/components/ConditionReportCard";
import { timeAgo } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const [{ data: course }, { data: score }, { data: reports }] = await Promise.all([
    supabase.from("courses").select("id, name, city, state, hole_count").eq("id", courseId).single(),
    supabase.from("course_condition_score").select("*").eq("course_id", courseId).single(),
    supabase
      .from("condition_reports")
      .select(
        "id, played_at, green_speed, firmness, bunker_rating, fairway_rating, pace_minutes, notes, photo_url, played_verified, profiles(username)"
      )
      .eq("course_id", courseId)
      .order("played_at", { ascending: false })
      .limit(20),
  ]);

  if (!course) notFound();

  const hasRecentReports = (score?.reports_last_7_days ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#F3F6F1] pb-16">
      {/* Header */}
      <div className="bg-[#1B4332] px-5 pt-8 pb-6">
        <p className="text-xs uppercase tracking-wide text-[#B7C9BB] mb-1">
          {course.city && course.state ? `${course.city}, ${course.state}` : "Course"}
        </p>
        <h1 className="text-2xl font-bold text-white mb-1">{course.name}</h1>
        <p className="text-sm text-[#B7C9BB]">{course.hole_count} holes</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-3">
        {/* Conditions summary card */}
        <section className="bg-[#F3F6F1] rounded-lg mb-6">
          <div className="flex items-center justify-between mb-3 pt-4">
            <h2 className="text-sm font-semibold text-[#17241D]">Conditions</h2>
            {score?.most_recent_report_at ? (
              <span className="text-xs text-[#5B6B5F]">
                as of {timeAgo(score.most_recent_report_at)}
              </span>
            ) : null}
          </div>

          {hasRecentReports ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <ConditionScoreCard label="Green speed" score={score?.green_speed_score ?? null} />
                <ConditionScoreCard label="Firmness" score={score?.firmness_score ?? null} />
                <ConditionScoreCard label="Bunkers" score={score?.bunker_score ?? null} />
                <ConditionScoreCard label="Fairways" score={score?.fairway_score ?? null} />
              </div>
              <p className="text-xs text-[#5B6B5F]">
                Based on {score?.reports_last_7_days} report
                {score?.reports_last_7_days === 1 ? "" : "s"} in the last 7 days
                {score?.avg_pace_minutes_last_7_days
                  ? ` · avg pace ${score.avg_pace_minutes_last_7_days} min`
                  : ""}
              </p>
            </>
          ) : (
            <div className="bg-white rounded-md border border-dashed border-[#C7D2C3] px-4 py-6 text-center">
              <p className="text-sm text-[#3A4A3E] mb-1">No reports yet this week</p>
              <p className="text-xs text-[#5B6B5F]">
                Be the first to report today&rsquo;s conditions.
              </p>
            </div>
          )}
        </section>

        {/* Report CTA */}
        <Link
          href={`/report/new?courseId=${course.id}`}
          className="block w-full h-12 mb-8 rounded-md bg-[#E85D04] text-white font-semibold text-[15px] text-center leading-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          Report today&rsquo;s conditions
        </Link>

        {/* Recent reports feed */}
        <section>
          <h2 className="text-sm font-semibold text-[#17241D] mb-3">Recent reports</h2>
          {reports && reports.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reports.map((report) => (
                // @ts-expect-error -- profiles comes back as an object from
                // the single FK join; Supabase's generated types often
                // infer it as an array. Regenerate types against your
                // schema to remove this once set up.
                <ConditionReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5B6B5F]">No reports yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}