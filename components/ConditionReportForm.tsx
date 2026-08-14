"use client"

import { useActionState, useState } from "react";
import { submitConditionReport, type ReportFormState } from "@/app/report/new/actions";
import { createClient } from "@/lib/supabase/client";

const initialState: ReportFormState = { status: "idle"};

function nowLocalDateTime() {
    // Format the current time for a datetime-local input's default value.
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function RatingScale({
    name,
    label,
    hint,
    value,
    onChange,
}: {
    name: string;
    label: string;
    hint: string;
    value: number | null;
    onChange: (v: number | null) => void;
}) {
    return (
        <fieldset className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
                <legend className="text-[15px] font-semibold text-[#17241D]">{label}</legend>
                <span className="text-xs text-[#586B5F]">{hint}</span>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                    const selected = value === n;
                    return (
                        <button
                            key={n}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onChange(selected ? null : n)}
                            className={`h-11 flex-1 rounded-md text-sm font-medium transition-colors
                                ${
                                selected
                                    ? "bg-[#1B4332] text-[#F3F6F1] shadow-sm"
                                    : "bg-[#EAEFE7] text-[#3A4A3E] hover:bg-[#DCE5D8]"
                                }
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85D04]`}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>
            <input type="hidden" name={name} value={value ?? ""} />
        </fieldset>
    );
}

export function submitConditionReport({
    courseId,
    courseName,
}: {
    courseId: string;
    courseName: string;
}) {
    const [state, formAction, pending] = useActionState(submitConditionReport, initialState);

    const [greenSpeed, setGreenSpeed] = useState<number | null>(null);
    const [firmness, setFirmness] = useState<number | null>(null);
    const [bunkers, setBunkers] = useState<number | null>(null);
    const [fairways, setFairways] = useState<number | null>(null);
    const [notesLength, setNotesLength] = useState(0);

    const [photoUrl, setPhotoUrl] = useState<string |null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhotoUploading(true);
        setPhotoError(null);

        const supabase = createClient();
        const path = `${courseId}/${Date.now()}-${file.name}`;

        const { error } = await supabase.storage 
            .from("condition-photos")
            .upload(path, file, { cacheControl: "3600", upsert: false });

        if (error) {
            setPhotoError("Photo didn't upload - you can stil submit without it.");
            setPhotoUploading(false);
            return;
        }

        const { data: publicUrl } = supabase.storage.from("condition-photos").getPublicUrl(path);
        setPhotoUrl(publicUrl.publicUrl);
        setPhotoUploading(false);
    }

    if (state.status === "success") {
        return (
            <div className="max-w-md mx-auto p-6 rounded-lg bg-[#EAEFE7] text-center">
                <p className="text-[#1B4332] font-semibold text-lg mb-1">Report submitted</p>
                <p className="text-sm text-[#3A4A3E]">{state.message}</p>
            </div>
        );
    }

    return (
        <form action={formAction} className="max-w-md mx-auto p-5 bg-[#F3F6F1] rounded-lg">
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="phot_url" value={photoUrl ?? ""} />

            <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-[#5B6B5F] mb-1">Reporting conditions</p>
                <h1 className="text-xl font-bold text-[#17241D]">{courseName}</h1>
            </div>

            <div className="mb-6">
                <label htmlFor="played_at" className="block text-[15px] font semibold text-[#17241D] mb-2">
                    When did you play?
                </label>
                <input
                    id="played_at"
                    name="played_at"
                    type="datetime-local"
                    required
                    defaultValue={nowLocalDateTime()}
                    max={nowLocalDateTime()}
                    className="w-full h-11 px-3 rounded-md border border-[#C7D2C3] bg-white text-[#17241D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E85D04]"
                />
                <p className="text-xs text-[#5B6B5F] mt-1.5">
                    Has to be within the last 24 hours - that's what keeps this page trustworthy.
                </p>
            </div>

            <RatingScale name="green_speed" label="Green speed" hint="1 slow · 5 fast" value={greenSpeed} onChange={setGreenSpeed} />
            <RatingScale name="firmness" label="Firmness" hint="1 soft · 5 firm" value={firmness} onChange={setFirmness} />
            <RatingScale name="bunker_rating" label="Bunkers" hint="1 rough · 5 great" value={bunkers} onChange={setBunkers} />
            <RatingScale name="fairway_rating" label="Fairways" hint="1 rough · 5 great" value={fairways} onChange={setFairways} />

            <div className="mb-6">
                <label htmlFor="pace_minutes" className="bloock text-[15px] font-semibold text-[#17241D] mb-2">
                    Pace of play
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="pace_minutes"
                        name="pace_minutes"
                        type="number"
                        min={60}
                        max={360}
                        step={5}
                        placeholder="245"
                        className="w-28 h-11 px-3 rounded-md border border-[#C7D2C3] bg-white text-[#17241D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E85D04]"
                    />
                    <span className="text-sm text-[#5B6B5F]">minutes, 18 holes</span>
                </div>
            </div>

            <div className="mb-6">
                <label htmlFor="photo" className="block text-[15px] font-semibold text-[#17241D] mb-2">
                Photo <span className="font-normal text-[#5B6B5F]">(optional)</span>
                </label>
                <input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-[#3A4A3E] file:mr-3 file:h-11 file:px-4 file:rounded-md file:border-0 file:bg-[#EAEFE7] file:text-[#1B4332] file:font-medium"
                />
                {photoUploading && <p className="text-xs text-[#5B6B5F] mt-1.5">Uploading…</p>}
                {photoUrl && !photoUploading && <p className="text-xs text-[#1B4332] mt-1.5">Photo attached</p>}
                {photoError && <p className="text-xs text-[#B3401D] mt-1.5">{photoError}</p>}
            </div>
        
            <div className="mb-6">
                <label htmlFor="notes" className="block text-[15px] font-semibold text-[#17241D] mb-2">
                Anything else? <span className="font-normal text-[#5B6B5F]">(optional)</span>
                </label>
                <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={500}
                onChange={(e) => setNotesLength(e.target.value.length)}
                placeholder="Cart path only on the back nine, standing water on 4..."
                className="w-full px-3 py-2 rounded-md border border-[#C7D2C3] bg-white text-[#17241D] resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E85D04]"
                />
                <p className="text-xs text-[#5B6B5F] mt-1 text-right">{notesLength}/500</p>
            </div>
        
            {state.status === "error" && (
                <p role="alert" className="mb-4 text-sm text-[#B3401D] bg-[#FBEAE3] rounded-md px-3 py-2">
                {state.message}
                </p>
            )}
        
            <button
                type="submit"
                disabled={pending || photoUploading}
                className="w-full h-12 rounded-md bg-[#E85D04] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
                {pending ? "Submitting…" : "Submit report"}
            </button>
        </form>
    )
}