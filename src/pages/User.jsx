import { useEffect, useMemo, useState } from "react";
import { Eye, Edit2, Trash2, UserPlus, Search, X, Shield, Mail, Phone, UserCheck } from "lucide-react";
import { saveUser, deleteUser } from "../services/db";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useUsers } from "../hooks/useApiQueries";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";
import { TableSkeleton } from "../components/Skeleton";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "Staff",
  department: "",
  status: "Active",
  notes: "",
};

export default function Users() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced]);

  const filters = useMemo(
    () => ({
      search: searchDebounced || undefined,
      page: currentPage,
      per_page: 20,
    }),
    [searchDebounced, currentPage]
  );

  const { data: usersResult, isLoading } = useUsers(filters);
  const data = Array.isArray(usersResult?.data) ? usersResult.data : [];
  const meta = usersResult?.meta ?? null;

  const openAdd = () => {
    setForm({ ...emptyForm, password: "" });
    setErrors({});
    setOpenForm(true);
  };

  const openEdit = (item) => {
    setForm({ ...item, password: "" });
    setErrors({});
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      toast.success("User deleted successfully");
      invalidateCache("/users");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Name required";
    if (!form.email) e.email = "Email required";
    if (!form.role) e.role = "Role required";
    if (!form.id && !form.password) e.password = "Password required for new users";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await saveUser(form);
      toast.success("User saved successfully");
      setOpenForm(false);
      invalidateCache("/users");
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error) {
      console.error(error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        toast.error("Validation failed");
      } else {
        toast.error("Failed to save user");
      }
    }
  };

  const inputClass = (f) => `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;
  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">Manage team members and their access permissions.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden min-h-[400px]">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Team Members</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {meta && (
          <div className="px-4 md:px-6 py-2 border-b border-gray-100 bg-gray-50/30 text-xs font-semibold text-slate-500">
            {meta
              ? `Showing ${(meta.current_page - 1) * meta.per_page + 1}–${Math.min(
                  meta.current_page * meta.per_page,
                  meta.total
                )} of ${meta.total}`
              : `Showing ${filteredData.length}`}
          </div>
        )}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email & Phone</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-0">
                    <TableSkeleton rows={6} cols={5} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 italic">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.department || "No Dept."}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <Mail size={12} className="text-slate-400" /> {item.email}
                        </div>
                        {item.phone && (
                          <div className="flex items-center gap-2 text-slate-600 text-xs">
                            <Phone size={12} className="text-slate-400" /> {item.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-slate-600 text-xs font-semibold w-fit border border-gray-200">
                        <Shield size={12} />
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                          item.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          onClick={() => openViewModal(item)} title="View">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(item)} title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(item.id)} title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Showing {(meta.current_page - 1) * meta.per_page + 1}–
              {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={meta.current_page >= meta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Profile</h2>
              <button onClick={() => setOpenView(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-3xl font-bold border-4 border-white shadow-lg">
                  {viewItem.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{viewItem.name}</h3>
                  <p className="text-slate-500 font-medium">{viewItem.role} • {viewItem.department || "No Department"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Contact Email</p>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Mail size={16} className="text-brand-500" />
                    {viewItem.email}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Phone Number</p>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Phone size={16} className="text-brand-500" />
                    {viewItem.phone || "Not Provided"}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Account Status</p>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <UserCheck size={16} className={viewItem.status === "Active" ? "text-emerald-500" : "text-red-500"} />
                    {viewItem.status}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-slate-600 italic whitespace-pre-wrap">{viewItem.notes || "No additional notes."}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setOpenView(false)} className="btn-secondary">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {form.id ? "Edit User" : "Add New User"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Fill in the user's account details.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-6">
              <label className="block">
                <span className="label">Name <Req /></span>
                <input
                  className={inputClass("name")}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
                {errors.name && <span className="text-xs text-red-500 mt-1 block">{errors.name}</span>}
              </label>

              <label className="block">
                <span className="label">Email <Req /></span>
                <input
                  className={inputClass("email")}
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
                {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
              </label>

              <label className="block">
                <span className="label">Phone</span>
                <input
                  className={inputClass("phone")}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="label">
                  Password {form.id ? <span className="text-slate-400 font-normal ml-1 text-xs">(Optional)</span> : <Req />}
                </span>
                <input
                  type="password"
                  className={inputClass("password")}
                  value={form.password || ""}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  autoComplete="new-password"
                  placeholder={form.id ? "Leave blank to keep current" : ""}
                />
                {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
              </label>

              <label className="block">
                <span className="label">Role <Req /></span>
                <select
                  className={inputClass("role")}
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Staff</option>
                </select>
                {errors.role && <span className="text-xs text-red-500 mt-1 block">{errors.role}</span>}
              </label>

              <label className="block">
                <span className="label">Department</span>
                <input
                  className={inputClass("department")}
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="label">Status</span>
                <select
                  className={inputClass("status")}
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>

              <label className="md:col-span-2 block">
                <span className="label">Notes</span>
                <textarea
                  className={`${inputClass("notes")} min-h-[100px]`}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setOpenForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Save User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
