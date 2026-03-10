"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, UserCircle, LogOut } from "lucide-react";

export default function StudentSidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: "My Courses", href: "/my-courses", icon: BookOpen },

    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-8">
                <h1 className="text-2xl font-black text-blue-600 tracking-tighter">STUDENT PANEL</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${pathname === item.href
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                            }`}
                    >
                        <item.icon size={20} />
                        {item.name}
                    </Link>
                ))}
            </nav>
        </aside>
    );
}