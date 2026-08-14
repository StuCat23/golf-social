import { timeAgo } from "../lib/format";

type ConditionReport = {
  id: string;
  played_at: string;
  green_speed: number | null;
  firmness: number | null;
  bunker_rating: number | null;
  fairway_rating: number | null;
  pace_minutes: number | null;
  notes: string | null;
  photo_url: string | null;
  played_verified: boolean;
  profiles: { username: string } | null;
};

const RATING_LABELS: Record<string, string> = {
  green_speed: "Greens",
  firmness: "Firmness",
  bunker_rating: "Bunkers",
  fairway_rating: "Fairways",
};

export function ConditionReportCard({ report }: { report: ConditionReport }) {
  const ratings = (["green_speed", "firmness", "bunker_rating", "fairway_rating"] as const).filter(
    (key) => report[key] !== null
  );

  return (
    <article className="bg-white rounded-md border border-[#E3E9DF] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#17241D]">
            {report.profiles?.username ?? "A golfer"}
          </span>
          {report.played_verified && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1B4332] bg-[#DCE5D8] rounded px-1.5 py-0.5">
              Verified round
            </span>
          )}
        </div>
        <span className="text-xs text-[#5B6B5F]">{timeAgo(report.played_at)}</span>
      </div>

      {ratings.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {ratings.map((key) => (
            <span
              key={key}
              className="text-xs font-medium text-[#3A4A3E] bg-[#EAEFE7] rounded px-2 py-1"
            >
              {RATING_LABELS[key]} {report[key]}/5
            </span>
          ))}
        </div>
      )}

      {report.pace_minutes && (
        <p className="text-xs text-[#5B6B5F] mb-2">Played in {report.pace_minutes} min</p>
      )}

      {report.notes && <p className="text-sm text-[#3A4A3E] mb-2.5">{report.notes}</p>}

      {report.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.photo_url}
          alt="Course condition photo"
          className="rounded-md w-full max-h-64 object-cover"
        />
      )}
    </article>
  );
}