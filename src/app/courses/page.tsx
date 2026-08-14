import { CourseSearch } from "@/components/CourseSearch";

export default function CoursesPage() {
    return (
        <main className="min-h-screen bg-[#F3F6F1] px-4 py-8">
            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-[#17241D] mb-1">Find a course</h1>
                <p className="text-sm text-[#5B6B5F] mb-6">Check conditions before you drive out.</p>
                <CourseSearch />
            </div>
        </main>
    )
}