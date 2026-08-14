import { createClient } from "@/lib/supabase/server";
import { ConditionReportForm } from "@/components/ConditionReportForm";
import { redirect } from "next/navigation";

export default async function NewReportPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>;
}) {
    const { courseId } = await searchParams;

    if (!courseId) {
        redirect("/courses");
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=/report/new?courseId=${courseId}`);
    }

    const { data: course } = await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .single();

    if (!course) {
        redirect("/courses");
    }

    return (
        <main className="min-h-screen bg-[#F3F6F1] py-8 px-4">
            <ConditionReportForm courseId={course.id} courseName={course.name} />
        </main>
    );
}