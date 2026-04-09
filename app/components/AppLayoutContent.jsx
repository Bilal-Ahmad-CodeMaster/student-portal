"use client";
import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import StudentSidebar from "./StudentSidebar";
import Header from "./Header";
import { ArrowLeft } from "lucide-react"; // Import for the back button

export default function AppLayoutContent({ children }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isLecturePage = pathname.includes("/lecture/") || pathname.includes("/course/");
    useEffect(() => {
        if (!loading) {
            if (user && pathname === "/login") {
                user.role === "STUDENT" ? router.push("/my-courses") : router.push("/users");
            }
            if (!user && pathname !== "/login") {
                router.push("/login");
            }
        }
    }, [user, loading, pathname, router]);

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
    if (!user || pathname === "/login") return <main className="w-full h-screen bg-white">{children}</main>;

    // --- FULLSCREEN LECTURE LAYOUT ---
    if (isLecturePage) {
        return (
            <div className="h-screen bg-[#0a0f18] overflow-hidden flex flex-col">
                {/* Minimalist Top Bar with Back Arrow */}
                <div className="p-4 flex items-center gap-4 bg-[#111827]/50 border-b border-slate-800">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-full text-white transition-all border border-slate-700 flex items-center justify-center"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Exit Lecture Mode
                    </span>
                </div>
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </main>
            </div>
        );
    }
    // --- STANDARD DASHBOARD LAYOUT ---
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
            {user.role === "STUDENT" ? <StudentSidebar /> : <Sidebar />}
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}