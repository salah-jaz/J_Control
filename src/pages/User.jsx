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
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";

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
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Team & Identity Management"
          subtitle="Administer organizational access, departmental hierarchy, and user credentials."
          primaryAction={(
            <button onClick={openAdd} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <UserPlus size={16} />
              </div>
              <span>Register User</span>
            </button>
          )}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identity Profile</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-64">Contact Intelligence</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Privileges</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-36">Status</th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing User Directory...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="5" className="p-20"><EmptyState icon={UserCheck} title="No Users Indexed" description="The organizational directory is currently void for this filter criteria." /></td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                      <td className="px-6 lg:px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner border border-indigo-100/50">
                            {item.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-slate-900 leading-none">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              {item.department || "Independent Unit"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-slate-600 text-[12px] font-bold">
                            <Mail size={12} className="text-indigo-400" /> {item.email}
                          </div>
                          {item.phone && (
                            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                              <Phone size={11} className="text-slate-300" /> {item.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider w-fit">
                          <Shield size={12} className="text-indigo-500" />
                          {item.role}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 border shadow-sm",
                          item.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        )}>
                          <div className={clsx('w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]', 
                            item.status === "Active" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50"
                          )} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 lg:px-8 py-5 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <ActionIconButton onClick={() => openViewModal(item)} title="Audit Profile" icon={Eye} tone="view" />
                          <ActionIconButton onClick={() => openEdit(item)} title="Modify Credentials" icon={Edit2} tone="edit" />
                          <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Account" icon={Trash2} tone="delete" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
          {meta && <TablePagination summary={`Indexed ${filteredData.length} of ${meta.total} Corporate Identities`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={meta.current_page <= 1} nextDisabled={meta.current_page >= meta.last_page} />}
        </div>
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
