"use client";
import { useEffect, useState } from "react";
import api from "@/app/lib/axios";
import { PlayCircle, Clock, BookOpen, Loader2, X, Play } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null); // Track course for modal
    const router = useRouter();

    useEffect(() => {
        api.get("/course/my-assigned").then(res => {
            setCourses(res.data.data.courses);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const openVideoModal = (course) => setSelectedCourse(course);
    const closeVideoModal = () => setSelectedCourse(null);

    const handleStartVideo = (courseId, videoId) => {
        // REMOVED 'student/course' and replaced with 'my-courses'
        router.push(`/my-courses/${courseId}/lecture/${videoId}`);
    };

    if (loading) {
        return (
            <div className="h-[60vh] w-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            <h1 className="text-3xl font-black text-slate-900">My Courses</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                    <div key={course._id} className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-100 flex flex-col">
                        <img src={course.coursePic} className="w-full h-40 object-cover rounded-xl mb-4" alt={course.title} />
                        <h3 className="text-xl font-bold mb-4">{course.title}</h3>
                        <button
                            onClick={() => openVideoModal(course)}
                            className="mt-auto w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <PlayCircle size={18} /> View Lectures
                        </button>
                    </div>
                ))}
            </div>

            {/* VIDEO SELECTION MODAL */}
            {selectedCourse && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black">{selectedCourse.title}</h2>
                                <p className="text-sm text-slate-500">{selectedCourse.videos.length} Lectures available</p>
                            </div>
                            <button onClick={closeVideoModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-3">
                            {selectedCourse.videos.map((video, index) => (
                                <div
                                    key={video._id}
                                    onClick={() => handleStartVideo(selectedCourse._id, video._id)}
                                    className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <span className="font-bold text-sm">{index + 1}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{video.title}</h4>
                                            <p className="text-xs text-slate-500 truncate max-w-xs">{video.description || "No description available"}</p>
                                        </div>
                                    </div>
                                    <Play size={18} className="text-slate-300 group-hover:text-blue-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}