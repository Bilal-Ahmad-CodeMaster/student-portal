"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Camera, Loader2, X, BookOpen, Film, Image as ImageIcon, CheckCircle2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/app/lib/axios";
import imageCompression from 'browser-image-compression';

export default function CourseModal({ isOpen, onClose, course, refresh }) {
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [errors, setErrors] = useState({});

    const initialState = {
        title: "",
        description: "",
        price: "",
        duration: "",
        level: "Beginner",
        status: "active",
        notes: "",
        transcript: "" // Added transcript field
    };

    const [formData, setFormData] = useState(initialState);

    useEffect(() => {
        if (course) {
            setFormData({
                title: course.title || "",
                description: course.description || "",
                price: course.price || "",
                duration: course.duration || "",
                level: course.level || "Beginner",
                status: course.status || "active",
                notes: course.notes || "",
                transcript: course.transcript || "" // Load transcript on edit
            });
        } else {
            setFormData(initialState);
        }
        setErrors({});
        setSelectedImage(null);
        setSelectedVideo(null);
    }, [course, isOpen]);

    const imagePreview = useMemo(() => {
        if (selectedImage) return URL.createObjectURL(selectedImage);
        return course?.coursePic || null;
    }, [selectedImage, course]);

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const options = { maxWidthOrHeight: 1024, useWebWorker: true, initialQuality: 0.7 };
        try {
            toast.loading("Optimizing image...", { id: "media-op" });
            const compressedFile = await imageCompression(file, options);
            setSelectedImage(compressedFile);
            toast.success("Image ready", { id: "media-op" });
        } catch (error) {
            setSelectedImage(file);
            toast.dismiss("media-op");
        }
    };

    const validate = () => {
        let newErrors = {};
        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.price) newErrors.price = "Price is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        const data = new FormData();

        Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
                data.append(key, formData[key]);
            }
        });

        if (selectedImage) data.append("coursePic", selectedImage);
        if (selectedVideo) data.append("courseVideo", selectedVideo);

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (course) {
                await api.put(`/course/update/${course._id}`, data, config);
                toast.success("Course updated successfully");
            } else {
                await api.post("/course/addcourse", data, config);
                toast.success("Course published successfully");
            }
            refresh();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Sync failed");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="font-bold text-xl text-slate-900">{course ? "Edit Course" : "Create New Course"}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">S3 Media Management</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cover Image</label>
                            <div className="relative h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group hover:border-slate-900 transition-all">
                                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /> : <ImageIcon className="text-slate-300" size={24} />}
                                <input type="file" name="coursePic" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageSelect} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Promo Video</label>
                            <div className="relative h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center group hover:border-indigo-400 transition-all">
                                <div className="flex flex-col items-center gap-2">
                                    {selectedVideo ? <><CheckCircle2 className="text-green-500" size={24} /><span className="text-[9px] font-bold text-slate-500 uppercase px-2 truncate w-32 text-center">{selectedVideo.name}</span></> : <><Film className="text-slate-300" size={24} /><span className="text-[9px] font-bold text-slate-400 uppercase">Select MP4</span></>}
                                </div>
                                <input type="file" name="courseVideo" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedVideo(e.target.files[0])} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Course Title *</label>
                            <input className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm outline-none focus:border-slate-900 bg-slate-50/50" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description *</label>
                            <textarea rows="2" className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm outline-none focus:border-slate-900 bg-slate-50/50 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        {/* NEW: Transcript Field */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1 flex items-center gap-1">
                                <FileText size={12} /> Lecture Transcript
                            </label>
                            <textarea
                                rows="4"
                                placeholder="Paste the video transcript here for the AI Tutor and student view..."
                                className="w-full border border-indigo-100 p-3.5 rounded-2xl text-xs font-mono outline-none focus:border-indigo-500 bg-indigo-50/30 resize-none custom-scrollbar"
                                value={formData.transcript}
                                onChange={e => setFormData({ ...formData, transcript: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Price ($)</label>
                                <input type="number" className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm outline-none focus:border-slate-900 bg-slate-50/50" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Duration</label>
                                <input className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm outline-none focus:border-slate-900 bg-slate-50/50" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Level</label>
                                <select className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm bg-slate-50/50" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Status</label>
                                <select className="w-full border border-slate-200 p-3.5 rounded-2xl text-sm bg-slate-50/50" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="upcoming">Upcoming</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-bold hover:bg-slate-800 disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-xl shadow-slate-200/50 transition-all">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : (course ? "Update Curriculum" : "Sync to Cloud")}
                    </button>
                </form>
            </div>
        </div>
    );
}