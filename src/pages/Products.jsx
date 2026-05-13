import { useState, useMemo, useEffect } from "react";
import { 
  Plus, Eye, Edit2, Trash2, X, Package, ShoppingBag, AlertTriangle, 
  Loader2, Filter, Activity, Save, Search, Download, ChevronRight,
  TrendingUp, Layers, CheckCircle2, ShoppingCart
} from "lucide-react";
import toast from "react-hot-toast";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "../hooks/useApiQueries";
import clsx from "clsx";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";

const emptyForm = {
  name: "",
  price: "",
  type: "Service",
  description: "",
  status: "Active",
  start_date: "",
  end_date: "",
  enable_alert: false,
};

const isAlertActive = (item) => {
  if (!item.enable_alert || !item.end_date) return false;
  const endDate = new Date(item.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shadow-inner", colorClass)}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-[20px] font-bold text-slate-900 leading-none mt-1">{value}</p>
    </div>
  </div>
);

export default function Products() {
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: dataRecords = [], isLoading } = useProducts();
  const data = Array.isArray(dataRecords) ? dataRecords : [];
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = !searchQuery || Object.values(item).some(
        (val) => val && val.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [data, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      active: data.filter(i => i.status === 'Active').length,
      products: data.filter(i => i.type === 'Product').length,
      services: data.filter(i => i.type === 'Service').length,
    };
  }, [data]);

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, data: formData });
        toast.success("Catalog entry updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("New entry recorded");
      }
      setOpenForm(false);
    } catch (e) {
      toast.error("Failed to sync catalog entry");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Purge this catalog entry?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Entry purged");
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setOpenForm(true);
  };

  const openViewDetail = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-8">
      <PageHeader
        title="Product & Service Catalog"
        subtitle="Manage organizational offerings, pricing models, and service parameters"
        primaryAction={(
          <button onClick={() => { setEditItem(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            <Plus size={18} />
            <span>Create Entry</span>
          </button>
        )}
        secondaryActions={(
          <button onClick={() => toast.error("Export not implemented")} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Catalog" value={stats.total} icon={Package} colorClass="bg-slate-800" />
        <StatCard title="Active Offering" value={stats.active} icon={CheckCircle2} colorClass="bg-emerald-600" />
        <StatCard title="Products" value={stats.products} icon={ShoppingCart} colorClass="bg-indigo-600" />
        <StatCard title="Services" value={stats.services} icon={Activity} colorClass="bg-violet-600" />
      </div>

      <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 sticky top-4 z-20">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, name, or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </FilterSelect>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2 border rounded-lg transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
          {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); }} />}
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Type Classification</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Product">Product</option>
              <option value="Service">Service</option>
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <TableSectionHeader title="Catalog Registry" summary={`${filteredData.length} records found`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Identification</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Classification</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Standard Rate</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-medium">Synchronizing catalog data...</td></tr>
              ) : filteredData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] font-bold text-slate-400">#{item.id}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-900">{item.name}</span>
                        {isAlertActive(item) && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={clsx("w-2 h-2 rounded-full", item.type === 'Product' ? 'bg-indigo-500' : 'bg-violet-500')}></div>
                      <span className="text-[12px] font-bold text-slate-600">{item.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-[14px] font-black text-slate-900 italic">
                      ₹{parseFloat(item.price || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider", item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ActionIconButton onClick={() => openViewDetail(item)} title="View Detail" icon={Eye} tone="view" />
                      <ActionIconButton onClick={() => openEdit(item)} title="Edit Entry" icon={Edit2} tone="edit" />
                      <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Entry" icon={Trash2} tone="delete" />
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredData.length === 0 && (
                <tr><td colSpan="5" className="p-20"><EmptyState icon={Package} title="No Catalog Matches" description="Adjust your filters or create a new entry to populate the registry." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductForm
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        product={editItem}
        onSave={handleSave}
      />

      <SlideOver
        isOpen={openView}
        onClose={() => setOpenView(false)}
        title="Catalog Intelligence"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setOpenView(false)} className="px-6 py-2 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-black transition-colors">Dismiss Detail</button></div>}
      >
        {viewItem && (
          <div className="space-y-8">
            <div className="flex items-center gap-5 p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Package size={120} /></div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Catalog Item</p>
                 <h3 className="text-[24px] font-black tracking-tight">{viewItem.name}</h3>
                 <p className="text-[12px] text-slate-400 font-medium mt-1">Classification: <span className="text-indigo-400 uppercase">{viewItem.type}</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Standard Valuation</p>
                <p className="text-[22px] font-black text-indigo-600 font-mono italic leading-none">₹{parseFloat(viewItem.price || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lifecycle Status</p>
                <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider", viewItem.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {viewItem.status}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</p>
                   <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><CalendarIcon size={14} className="text-slate-400"/> {viewItem.start_date || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">End / Renewal Date</p>
                   <p className={clsx("text-[13px] font-bold flex items-center gap-1.5", isAlertActive(viewItem) ? 'text-amber-600' : 'text-slate-800')}>
                     <AlertTriangle size={14} className={isAlertActive(viewItem) ? 'text-amber-500' : 'text-slate-400'}/> {viewItem.end_date || 'N/A'}
                   </p>
                 </div>
               </div>
            </div>

            {viewItem.description && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Specification / Scope</p>
                <div className="p-4 bg-white border border-slate-100 rounded-xl text-[13px] text-slate-600 leading-relaxed shadow-sm italic">
                  "{viewItem.description}"
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}

const ProductForm = ({ isOpen, onClose, product, onSave }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) setForm({ ...emptyForm, ...product });
    else setForm(emptyForm);
    setErrors({});
  }, [product, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Identification required";
    if (!form.price) e.price = "Valuation required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave(form);
    } finally {
      setIsSaving(false);
    }
  };

  const Label = ({ children, required }) => (
    <label className="block text-[12px] font-bold text-slate-700 mb-1">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:border-indigo-500 transition-all";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Modify Entry Profile' : 'Configure New Catalog Entry'}
      footer={(
        <div className="flex justify-end items-center w-full px-1 gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Discard</button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            {product ? 'Commit Changes' : 'Record Entry'}
          </button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
            <h4 className="text-[12px] font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
              General Configuration
            </h4>
          </div>
          
          <div>
            <Label required>Entry Name</Label>
            <input className={clsx(inputCls, errors.name && "border-rose-400")} placeholder="e.g. Enterprise Cloud Compute" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Standard Price (₹)</Label>
              <input type="number" className={clsx(inputCls, "font-bold")} placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Classification</Label>
              <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Service</option>
                <option>Product</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Technical Scope / Description</Label>
            <textarea className={clsx(inputCls, "min-h-[100px] resize-none")} placeholder="Specify operational details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
            <h4 className="text-[12px] font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
              Operational Parameters
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lifecycle Status</Label>
              <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.enable_alert} onChange={e => setForm({ ...form, enable_alert: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-[13px] font-bold text-slate-700">Maturity Alerts</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start / Deployment Date</Label>
              <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End / Renewal Date</Label>
              <input type="date" className={inputCls} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  );
};
