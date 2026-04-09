"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    X, Film, Image as ImageIcon, CheckCircle2, FileText,
    Upload, Loader2, Plus, Trash2, Settings
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/app/lib/axios";
import imageCompression from 'browser-image-compression';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function CourseModal({ isOpen, onClose, course, refresh }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const ffmpegRef = useRef(new FFmpeg());

    const [selectedImage, setSelectedImage] = useState(null);
    const [videoEntries, setVideoEntries] = useState([]);
    const [removedVideoIds, setRemovedVideoIds] = useState([]); // Track IDs to delete on server

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        duration: "",
        level: "Beginner",
        status: "active",
    });

    useEffect(() => {
        if (course) {
            setFormData({
                title: course.title || "",
                description: course.description || "",
                price: course.price || "",
                duration: course.duration || "",
                level: course.level || "Beginner",
                status: course.status || "active",
            });
            setVideoEntries(course.videos?.map(v => ({ ...v, isExisting: true })) || []);
            setRemovedVideoIds([]);
        } else {
            setFormData({ title: "", description: "", price: "", duration: "", level: "Beginner", status: "active" });
            setVideoEntries([]);
            setRemovedVideoIds([]);
        }
        setSelectedImage(null);
    }, [course, isOpen]);

    const compressVideo = async (file) => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg.loaded) {
            setStatus("Loading Compression Engine...");
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
        }
        setStatus(`Compressing: ${file.name}`);
        await ffmpeg.writeFile("input.mp4", await fetchFile(file));
        await ffmpeg.exec(["-i", "input.mp4", "-vcodec", "libx264", "-crf", "28", "-preset", "veryfast", "output.mp4"]);
        const data = await ffmpeg.readFile("output.mp4");
        return new Blob([data.buffer], { type: "video/mp4" });
    };

    const handleAddVideos = (e) => {
        const files = Array.from(e.target.files);
        const newEntries = files.map(file => ({
            file,
            thumb: null,
            title: file.name.split('.')[0],
            description: "",
            transcript: "",
            isNew: true
        }));
        setVideoEntries([...videoEntries, ...newEntries]);
    };

    const removeVideoEntry = (index) => {
        const entryToRemove = videoEntries[index];
        // If it was already on the server, track its ID for deletion
        if (entryToRemove.isExisting && entryToRemove._id) {
            setRemovedVideoIds(prev => [...prev, entryToRemove._id]);
        }
        setVideoEntries(videoEntries.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress(0);
        const data = new FormData();

        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (selectedImage) data.append("coursePic", selectedImage);

        // Append IDs to be removed
        removedVideoIds.forEach(id => data.append("removeVideoIds[]", id));

        try {
            const videoMetadata = [];

            for (let i = 0; i < videoEntries.length; i++) {
                const entry = videoEntries[i];
                if (entry.isNew) {
                    let fileToUpload = entry.file;
                    if (fileToUpload.size > 10 * 1024 * 1024) {
                        fileToUpload = await compressVideo(fileToUpload);
                    }
                    data.append("videos", fileToUpload);
                    if (entry.thumb) data.append("thumbnails", entry.thumb);
                }

                videoMetadata.push({
                    _id: entry._id || null, // Important for backend to identify existing docs
                    title: entry.title,
                    description: entry.description,
                    transcript: entry.transcript,
                    isExisting: entry.isExisting || false,
                    videoUrl: entry.videoUrl || ""
                });
            }

            data.append("videoMetadata", JSON.stringify(videoMetadata));

            setStatus("Uploading to Cloud...");
            const url = course ? `/course/update/${course._id}` : "/course/addcourse";
            const method = course ? "put" : "post";

            const response = await api[method](url, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (p) => {
                    const percent = Math.round((p.loaded * 100) / p.total);
                    if (percent < 98) {
                        setUploadProgress(percent);
                    } else {
                        setStatus("Finalizing assets on server...");
                        setUploadProgress(98);
                    }
                }
            });

            if (response.data.type === "success" || response.status === 200) {
                setUploadProgress(100);
                setStatus("Success! Curriculum Synced.");
                toast.success("All assets uploaded and verified!");

                setTimeout(() => {
                    refresh();
                    onClose();
                    setLoading(false);
                }, 800);
            } else {
                toast.error(response.data.message || "Something went wrong");
                setLoading(false);
            }

        } catch (err) {
            console.error("Upload Error:", err);
            toast.error(err.response?.data?.message || "Upload failed. Please check your connection.");
            setStatus("Upload Interrupted");
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="font-black text-2xl text-slate-900">{course ? "Update Curriculum" : "New Curriculum"}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Asset Management Engine</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="group relative h-48 rounded-[2rem] bg-slate-100 overflow-hidden border-2 border-dashed border-slate-200 hover:border-slate-900 transition-all">
                                {selectedImage || course?.coursePic ? (
                                    <img src={selectedImage ? URL.createObjectURL(selectedImage) : course.coursePic} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <ImageIcon size={40} />
                                        <span className="text-xs font-bold mt-2">COURSE COVER</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setSelectedImage(e.target.files[0])} />
                            </div>

                            <input placeholder="Course Title" className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            <textarea placeholder="Course Description" rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Price ($)</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-200 outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Duration</label>
                                    <input className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-200 outline-none" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Film size={18} /> Lectures</h3>
                                <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all">
                                    <Plus size={14} /> Add Videos
                                    <input type="file" multiple accept="video/*" className="hidden" onChange={handleAddVideos} />
                                </label>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {videoEntries.map((entry, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-3 relative group">
                                        <button type="button" onClick={() => removeVideoEntry(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">{idx + 1}</div>
                                            <input placeholder="Lecture Title" className="flex-1 bg-transparent border-none font-bold text-sm outline-none text-slate-700" value={entry.title} onChange={e => {
                                                const newEntries = [...videoEntries];
                                                newEntries[idx].title = e.target.value;
                                                setVideoEntries(newEntries);
                                            }} />
                                        </div>

                                        <textarea placeholder="Video Description..." className="w-full p-3 bg-white rounded-xl border-none ring-1 ring-slate-100 text-[11px] outline-none focus:ring-indigo-500 h-14 resize-none" value={entry.description} onChange={e => {
                                            const newEntries = [...videoEntries];
                                            newEntries[idx].description = e.target.value;
                                            setVideoEntries(newEntries);
                                        }} />

                                        <textarea placeholder="Paste Transcript for this lecture..." className="w-full p-3 bg-white rounded-xl border-none ring-1 ring-slate-100 text-[11px] outline-none focus:ring-indigo-500 h-20 resize-none" value={entry.transcript} onChange={e => {
                                            const newEntries = [...videoEntries];
                                            newEntries[idx].transcript = e.target.value;
                                            setVideoEntries(newEntries);
                                        }} />

                                        {entry.isNew && (
                                            <div className="flex items-center gap-4 mt-2">
                                                <label className="text-[10px] font-bold text-indigo-600 cursor-pointer flex items-center gap-1 hover:underline">
                                                    <ImageIcon size={12} /> {entry.thumb ? "Thumbnail Set" : "Add Thumbnail"}
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                        const newEntries = [...videoEntries];
                                                        newEntries[idx].thumb = e.target.files[0];
                                                        setVideoEntries(newEntries);
                                                    }} />
                                                </label>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">File: {entry.file?.name}</span>
                                            </div>
                                        )}
                                        {entry.isExisting && (
                                            <div className="flex items-center gap-2 text-[9px] text-green-600 font-bold uppercase tracking-widest">
                                                <CheckCircle2 size={10} /> Hosted on Server
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 border-t pt-8">
                        {loading ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-600" size={20} />
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{status}</span>
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{uploadProgress}%</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3">
                                <Upload size={24} /> {course ? "Sync All Changes" : "Publish Curriculum"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}