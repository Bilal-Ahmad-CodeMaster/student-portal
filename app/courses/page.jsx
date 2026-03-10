"use client";
import { useEffect, useState, useMemo } from "react";
import api from "@/app/lib/axios";
import toast from "react-hot-toast";
import {
  Edit3, Trash2, Plus, Search, UserCheck, BookOpen,
  Video, Users, LayoutGrid, Calendar, ExternalLink
} from "lucide-react";
import CourseModal from "@/app/components/modals/CourseModal";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import AssignModal from "@/app/components/modals/AssignModal";
import ProtectedRoute from "../components/ProtectedRoute";

export default function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("ALL");
  const [studentFilter, setStudentFilter] = useState("ALL");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        api.get("/course/all"),
        api.get("/user/all")
      ]);

      const responseData = cRes.data.data;
      setCourses(responseData.courses || []);
      setStats({ total: responseData.totalCourses || 0 });

      setAllUsers(uRes.data.data.users || []);
    } catch (err) {
      toast.error("Failed to load curriculum data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(storedUser.role);
    fetchData();
  }, []);

  // --- Modal Control Functions ---

  // ADDED: Logic to open the Assignment Modal
  const openAssignModal = (course) => {
    setCurrentCourse(course);
    setIsAssignOpen(true);
  };

  const isAdmin = userRole === "ADMIN";
  const teachers = allUsers.filter(u => u.role === 'TEACHER');
  const students = allUsers.filter(u => u.role === 'STUDENT');

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeacher = teacherFilter === "ALL" || c.instructors.some(inst => inst._id === teacherFilter);
      const matchesStudent = studentFilter === "ALL" || c.assignedUsers.some(stud => stud._id === studentFilter);
      return matchesSearch && matchesTeacher && matchesStudent;
    });
  }, [courses, searchQuery, teacherFilter, studentFilter]);

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/course/delete/${deleteId}`);
      toast.success("Course archived successfully");
      fetchData();
      setIsDeleteOpen(false);
    } catch (err) {
      toast.error("Failed to delete course");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "TEACHER"]}>
    <div className="space-y-6 text-slate-900 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Course Catalog</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your educational assets and media.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setCurrentCourse(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold shadow-lg"
          >
            <Plus size={20} /> Create Course
          </button>
        )}
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Courses</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl"><LayoutGrid className="text-slate-400" /></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder="Search by title..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isAdmin && (
          <select
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="ALL">All Instructors</option>
            {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        )}
        <select
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="ALL">All Students</option>
          {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course Detail</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Engagement</th>
                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Media</th>
                {isAdmin && <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold animate-pulse text-xs tracking-widest uppercase">Fetching curriculum logs...</td></tr>
              ) : filteredCourses.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6 text-slate-900">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl border border-slate-100 overflow-hidden shrink-0 shadow-inner bg-slate-50">
                        {c.coursePic ? <img src={c.coursePic} className="w-full h-full object-cover" /> : <BookOpen size={20} className="text-slate-200 m-auto mt-4" />}
                      </div>
                      <div>
                        <a href={`/course-attendance/${c._id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">{c.title}</a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter bg-slate-100 px-2 py-0.5 rounded-md">{c.level}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold"><Calendar size={10} /> {c.duration}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-6">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                        <Users size={14} className="text-slate-400" />
                        {c.assignedUsersCount}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Enrolled</p>
                    </div>
                  </td>

                  <td className="p-6">
                    {c.courseVideo ? (
                      <a
                        href={c.courseVideo}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all"
                      >
                        <Video size={14} /> Watch Promo
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold italic">No Video</span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="p-6">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => { setCurrentCourse(c); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                          <Edit3 size={18} />
                        </button>
                        {/* THE BUTTON TRIGGER */}
                        <button onClick={() => openAssignModal(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <UserCheck size={18} />
                        </button>
                        <button onClick={() => { setDeleteId(c._id); setIsDeleteOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} course={currentCourse} refresh={fetchData} />
      <AssignModal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} course={currentCourse} allUsers={allUsers} refresh={fetchData} />
      <ConfirmModal isOpen={isDeleteOpen} loading={deleteLoading} onClose={() => setIsDeleteOpen(false)} onConfirm={confirmDelete} title="Archive Course" message="Are you sure you want to remove this course and unassign all students?" />
    </div>
    </ProtectedRoute>
  );
}