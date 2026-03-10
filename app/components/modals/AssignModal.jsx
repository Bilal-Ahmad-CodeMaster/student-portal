"use client";
import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, Check } from "lucide-react";
import api from "@/app/lib/axios";
import toast from "react-hot-toast";

export default function AssignModal({ isOpen, onClose, course, allUsers, refresh }) {
    const [loading, setLoading] = useState(false);
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Pre-fill existing assignments when modal opens
    useEffect(() => {
        if (isOpen && course) {
            // Extract IDs from the populated objects returned by your controller
            const existingTeachers = course.instructors?.map(i => typeof i === 'object' ? i._id : i) || [];
            const existingStudents = course.assignedUsers?.map(s => typeof s === 'object' ? s._id : s) || [];

            setSelectedTeachers(existingTeachers);
            setSelectedStudents(existingStudents);
        }
    }, [isOpen, course]);

    if (!isOpen) return null;

    const toggleSelection = (id, type) => {
        if (type === 'TEACHER') {
            setSelectedTeachers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedStudents(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // Matching the endpoint and payload your controller expects
            await api.post("/course/assign", {
                courseId: course._id,
                instructorIds: selectedTeachers,
                studentIds: selectedStudents
            });
            toast.success("Assignments updated successfully!");
            refresh();
            onClose();
        } catch (err) {
            toast.error("Failed to update assignments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] animate-in zoom-in duration-300 overflow-hidden">

                {/* Modal Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="font-black text-2xl text-slate-900 truncate max-w-[350px]">
                            Assign: {course?.title}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            Modify User Access Permissions
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-sm rounded-2xl transition-all text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">

                    {/* Teachers Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Instructors ({selectedTeachers.length})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {allUsers.filter(u => u.role === 'TEACHER').map(t => {
                                const isSelected = selectedTeachers.includes(t._id);
                                return (
                                    <div
                                        key={t._id}
                                        onClick={() => toggleSelection(t._id, 'TEACHER')}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${isSelected
                                            ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                                            : "border-slate-50 hover:border-slate-200 bg-slate-50/50"
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{t.name}</span>
                                            <span className={`text-[10px] ${isSelected ? "text-slate-400" : "text-slate-400"}`}>@{t.userName}</span>
                                        </div>
                                        {isSelected && <Check size={18} strokeWidth={3} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Students Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                Students ({selectedStudents.length})
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {allUsers.filter(u => u.role === 'STUDENT').map(s => {
                                const isSelected = selectedStudents.includes(s._id);
                                return (
                                    <div
                                        key={s._id}
                                        onClick={() => toggleSelection(s._id, 'STUDENT')}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                                            ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                                            : "border-slate-50 hover:border-slate-200 bg-slate-50/50"
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{s.name}</span>
                                            <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>ID: {s._id.substring(0, 6)}</span>
                                        </div>
                                        {isSelected && <Check size={18} strokeWidth={3} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/30">
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-2xl shadow-slate-900/20 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={22} /> : <><UserPlus size={22} /> Update Cloud Permissions</>}
                    </button>
                </div>
            </div>
        </div>
    );
}