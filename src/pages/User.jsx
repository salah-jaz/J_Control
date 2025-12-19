import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";

const STORAGE_KEY = "user_records";

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
  const [editIndex, setEditIndex] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  /* LOAD */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    setData(saved);
  }, []);

  const syncStorage = (records) => {
    setData(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditIndex(null);
    setOpenForm(true);
  };

  const openEdit = (item, index) => {
    setForm(item);
    setErrors({});
    setEditIndex(index);
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const deleteUser = (index) => {
    if (!window.confirm("Delete this user?")) return;
    syncStorage(data.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Name required";
    if (!form.email) e.email = "Email required";
    if (!form.role) e.role = "Role required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveUser = () => {
    if (!validate()) return;
    let updated = editIndex !== null ? [...data] : [...data, form];
    if (editIndex !== null) updated[editIndex] = form;
    syncStorage(updated);
    setOpenForm(false);
  };

  const inputClass = (f) => `input ${errors[f] ? "border-red-500" : ""}`;
  const Req = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Add User
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              <th className="p-4 text-left font-semibold">Name</th>
              <th className="p-4 text-left font-semibold">Email</th>
              <th className="p-4 text-left font-semibold">Role</th>
              <th className="p-4 text-left font-semibold">Status</th>
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">{item.email}</td>
                  <td className="p-4">{item.role}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-8 ">
                      <button className="text-blue-600 cursor-pointer"
                       onClick={() => openViewModal(item)}>
                        <Eye size={18} />
                      </button>
                      <button className="text-yellow-600 cursor-pointer"
                       onClick={() => openEdit(item, i)}>
                        <Edit2 size={18} />
                      </button>
                      <button className="text-red-600 cursor-pointer"
                       onClick={() => deleteUser(i)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white max-w-xl w-full rounded-xl p-8">
            <h2 className="text-xl font-bold mb-6">User Details</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              {Object.entries(viewItem).map(([k, v]) => (
                <div key={k}>
                  <p className="text-gray-400 uppercase text-xs">{k}</p>
                  <p className="font-semibold">{v || "-"}</p>
                </div>
              ))}
            </div>
            <div className="text-right mt-6">
              <button onClick={() => setOpenView(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl p-8">
            <h2 className="text-xl font-bold mb-6">
              {editIndex !== null ? "Edit User" : "Add New User"}
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              <label>
                Name <Req />
                <input
                  className={inputClass("name")}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </label>

              <label>
                Email <Req />
                <input
                  className={inputClass("email")}
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </label>

              <label>
                Phone
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </label>

              <label>
                Role <Req />
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
              </label>

              <label>
                Department
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </label>

              <label>
                Status
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>

              <label className="md:col-span-2">
                Notes
                <textarea
                  className="input h-24"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setOpenForm(false)}>Cancel</button>
              <button
                onClick={saveUser}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
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
