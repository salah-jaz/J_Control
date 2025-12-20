import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { getUsers, saveUser, deleteUser } from "../services/db";
import toast from "react-hot-toast";

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
  const [data, setData] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [loading, setLoading] = useState(true);

  /* LOAD */
  const fetchData = async () => {
    setLoading(true);
    try {
      const users = await getUsers();
      setData(users || []);
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      fetchData();
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
      fetchData();
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

  const inputClass = (f) => `w-full p-2 border rounded outline-none ${errors[f] ? "border-red-500" : "border-gray-300"}`;
  const Req = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-6 space-y-6 font-sans animate-fadeIn">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
        >
          + Add User
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading users...</td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{item.name}</td>
                  <td className="p-4 text-gray-600">{item.email}</td>
                  <td className="p-4 text-gray-600">{item.role}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${item.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button className="text-blue-600 hover:text-blue-800 transition"
                        onClick={() => openViewModal(item)} title="View">
                        <Eye size={18} />
                      </button>
                      <button className="text-yellow-600 hover:text-yellow-800 transition"
                        onClick={() => openEdit(item)} title="Edit">
                        <Edit2 size={18} />
                      </button>
                      <button className="text-red-600 hover:text-red-800 transition"
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

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white max-w-xl w-full rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-800">User Details</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div><p className="text-gray-400 text-xs uppercase">Name</p><p className="font-semibold">{viewItem.name}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Email</p><p className="font-semibold">{viewItem.email}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Phone</p><p className="font-semibold">{viewItem.phone || "-"}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Role</p><p className="font-semibold">{viewItem.role}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Department</p><p className="font-semibold">{viewItem.department || "-"}</p></div>
              <div><p className="text-gray-400 text-xs uppercase">Status</p><p className="font-semibold">{viewItem.status}</p></div>
              <div className="col-span-2"><p className="text-gray-400 text-xs uppercase">Notes</p><p className="font-semibold whitespace-pre-wrap">{viewItem.notes || "-"}</p></div>
            </div>
            <div className="text-right mt-6">
              <button onClick={() => setOpenView(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              {form.id ? "Edit User" : "Add New User"}
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Name <Req /></span>
                <input
                  className={inputClass("name")}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
                {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Email <Req /></span>
                <input
                  className={inputClass("email")}
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Phone</span>
                <input
                  className={inputClass("phone")}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">
                  Password {form.id ? <span className="text-gray-400 font-normal ml-1">(Leave blank to keep current)</span> : <Req />}
                </span>
                <input
                  type="password"
                  className={inputClass("password")}
                  value={form.password || ""}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  autoComplete="new-password"
                />
                {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Role <Req /></span>
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
                {errors.role && <span className="text-xs text-red-500">{errors.role}</span>}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Department</span>
                <input
                  className={inputClass("department")}
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-1 block">Status</span>
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
                <span className="text-sm font-medium text-gray-700 mb-1 block">Notes</span>
                <textarea
                  className={`${inputClass("notes")} h-24`}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setOpenForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
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
