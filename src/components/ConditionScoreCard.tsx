export function ConditionScoreCard({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const hasScore = score !== null && score !== undefined;
  const pct = hasScore ? (score / 5) * 100 : 0;

  return (
    <div className="bg-white rounded-md border border-[#E3E9DF] px-3 py-2.5">
      <p className="text-xs text-[#5B6B5F] mb-1">{label}</p>
      {hasScore ? (
        <>
          <p className="text-lg font-bold text-[#17241D] leading-none mb-1.5">
            {score.toFixed(1)}
            <span className="text-xs font-normal text-[#5B6B5F]">/5</span>
          </p>
          <div className="h-1.5 rounded-full bg-[#EAEFE7] overflow-hidden">
            <div className="h-full bg-[#1B4332] rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-[#9AA79C]">No data yet</p>
      )}
    </div>
  );
}