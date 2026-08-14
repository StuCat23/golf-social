import Link from "next/link";

export type CourseResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  hole_count: number;
  distance_meters?: number;
};

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return miles < 0.1 ? "< 0.1 mi" : `${miles.toFixed(1)} mi`;
}

export function CourseResultCard({ course }: { course: CourseResult }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="flex items-center justify-between bg-white rounded-md border border-[#E3E9DF] px-4 py-3 hover:border-[#1B4332] transition-colors"
    >
      <div>
        <p className="text-[15px] font-semibold text-[#17241D]">{course.name}</p>
        <p className="text-xs text-[#5B6B5F]">
          {course.city && course.state ? `${course.city}, ${course.state}` : `${course.hole_count} holes`}
        </p>
      </div>
      {course.distance_meters !== undefined && (
        <span className="text-xs font-medium text-[#1B4332] bg-[#EAEFE7] rounded px-2 py-1 whitespace-nowrap ml-3">
          {formatDistance(course.distance_meters)}
        </span>
      )}
    </Link>
  );
}