"use client";
import { useEffect, useState } from "react";
import api from "@/app/lib/axios";
import { PlayCircle, Clock, BookOpen, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation"; // 1. Import useRouter

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter(); // 2. Initialize router

    useEffect(() => {
        // Fetching all courses (recommend filtering by user ID on backend later)
        api.get("/course/my-assigned").then(res => {
            setCourses(res.data.data.courses);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, []);

    // 3. Navigation handler
    const handleStartLearning = (courseId) => {
        router.push(`/student/course/${courseId}`);
    };

    if (loading) {
        return (
            <div className="h-[60vh] w-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back!</h1>
                <p className="text-slate-500 font-medium">Pick up where you left off in your enrolled courses.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <div
                            key={course._id}
                            className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
                        >
                            <div className="w-full h-44 rounded-[2rem] overflow-hidden bg-slate-100 mb-5 relative">
                                {course.coursePic ? (
                                    <img src={course.coursePic} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={course.title} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <BookOpen size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />
                            </div>

                            <h3 className="text-xl font-extrabold text-slate-900 mb-2 truncate">{course.title}</h3>

                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                                <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500" /> {course.duration}</span>
                                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100">{course.level}</span>
                            </div>

                            {/* 4. Connected the Click Event */}
                            <button
                                onClick={() => handleStartLearning(course._id)}
                                className="mt-auto w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 transition-all active:scale-95"
                            >
                                <PlayCircle size={20} fill="currentColor" className="text-white" />
                                Start Learning
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                        <BookOpen className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold uppercase tracking-tighter">No active enrollments found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}