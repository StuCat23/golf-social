"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CourseResultCard, type CourseResult } from "@/components/CourseResultCard";

type Mode = "idle" | "search" | "nearby";

export function CourseSearch() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("courses")
      .select("id, name, city, state, hole_count")
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(25);
    setResults(data ?? []);
    setLoading(false);
  }, []);

  // Debounce search-as-you-type by 300ms.
  useEffect(() => {
    if (mode !== "search") return;
    const handle = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(handle);
  }, [query, mode, runSearch]);

  function handleTyping(value: string) {
    setQuery(value);
    setMode("search");
    setLocationError(null);
  }

  function handleUseLocation() {
    setMode("nearby");
    setLocationError(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support location — try searching by name instead.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("nearby_courses", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        if (error) {
          setLocationError("Couldn't load nearby courses. Try again.");
        } else {
          setResults(data ?? []);
        }
        setLoading(false);
      },
      () => {
        setLocationError("Location access denied — try searching by name instead.");
        setLoading(false);
      }
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Search courses by name"
          className="flex-1 h-11 px-3 rounded-md border border-[#C7D2C3] bg-white text-[#17241D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E85D04]"
        />
        <button
          type="button"
          onClick={handleUseLocation}
          className="h-11 px-4 rounded-md bg-[#1B4332] text-white text-sm font-medium whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85D04]"
        >
          Near me
        </button>
      </div>

      {locationError && (
        <p role="alert" className="text-sm text-[#B3401D] bg-[#FBEAE3] rounded-md px-3 py-2 mb-4">
          {locationError}
        </p>
      )}

      {loading && <p className="text-sm text-[#5B6B5F]">Loading…</p>}

      {!loading && mode === "idle" && (
        <p className="text-sm text-[#5B6B5F]">
          Search for a course by name, or tap &ldquo;Near me&rdquo; to find courses nearby.
        </p>
      )}

      {!loading && mode === "search" && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-[#5B6B5F]">No courses matched &ldquo;{query}&rdquo;.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((course) => (
            <CourseResultCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}