"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


export default function ProtectedRoute({ children, allowedRoles }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // 1. Get user data from LocalStorage
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const userRole = storedUser.role;

        if (!userRole) {
            // Not logged in at all? Go to login
            router.push("/login");
        } else if (allowedRoles && !allowedRoles.includes(userRole)) {
            // Logged in but wrong role?
            if (userRole === "STUDENT") {
                router.push("/my-courses"); // Redirect student to their panel
            } else {
                router.push("/unauthorized"); // Generic error page
            }
        } else {
            // Everything is fine
            setAuthorized(true);
        }
    }, [router, allowedRoles]);

    if (!authorized) {
        return <div className="h-screen flex items-center justify-center">Loading....</div>;
    }

    return children;
}