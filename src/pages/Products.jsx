import { useState, useMemo, useEffect } from "react";
import { 
  Plus, Eye, Edit2, Trash2, X, Package, ShoppingBag, AlertTriangle, 
  Loader2, Filter, Activity, Save, Search, Download, ChevronRight,
  TrendingUp, Layers, CheckCircle2, ShoppingCart, Target, Briefcase, Calendar
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
        toast.success("Product updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Product created");
      }
      setOpenForm(false);
    } catch (e) {
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Product deleted");
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
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Products"
          subtitle="Manage your products and services."
          primaryAction={(
            <button onClick={() => { setEditItem(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>New Product</span>
            </button>
          )}
          secondaryActions={(
            <button onClick={() => toast.error("Export not implemented")} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"><Download size={18} /></button>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <StatCard title="Total Items" value={stats.total} icon={Package} colorClass="bg-slate-800" />
          <StatCard title="Active Items" value={stats.active} icon={CheckCircle2} colorClass="bg-emerald-600" />
          <StatCard title="Products" value={stats.products} icon={ShoppingCart} colorClass="bg-indigo-600" />
          <StatCard title="Services" value={stats.services} icon={Activity} colorClass="bg-violet-600" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
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
            <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2.5 border rounded-xl transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); }} />}
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="bg-white px-6 lg:px-8 py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Type</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="Product">Products</option>
                <option value="Service">Services</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">Price</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Status</th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Loading products...</td></tr>
                ) : filteredData.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-black text-slate-400 italic tracking-tighter">#PROD-{item.id}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[13px] font-black text-slate-900 truncate">{item.name}</span>
                          {isAlertActive(item) && (
                            <div className="p-1 bg-amber-50 rounded-lg animate-bounce">
                              <AlertTriangle size={12} className="text-amber-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <div className={clsx("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]", item.type === 'Product' ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-violet-500 shadow-violet-500/50')}></div>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-mono text-[16px] font-black text-slate-900 italic tracking-tight">
                        ₹{parseFloat(item.price || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={clsx(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 border shadow-sm",
                        item.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                      )}>
                        <div className={clsx('w-1.5 h-1.5 rounded-full', item.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300')} />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 lg:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <ActionIconButton onClick={() => openViewDetail(item)} title="View" icon={Eye} tone="view" />
                        <ActionIconButton onClick={() => openEdit(item)} title="Edit" icon={Edit2} tone="edit" />
                        <ActionIconButton onClick={() => handleDelete(item.id)} title="Delete" icon={Trash2} tone="delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && filteredData.length === 0 && (
              <div className="p-20">
                <EmptyState icon={Package} title="No products found" description="Try adjusting your filters or add a new product." />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
           <div className="flex justify-between items-center">
             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Showing {filteredData.length} items</span>
           </div>
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
        title="Product Details"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setOpenView(false)} className="px-6 py-2 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-black transition-colors">Close</button></div>}
      >
        {viewItem && (
          <div className="space-y-8">
            <div className="flex items-center gap-5 p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Package size={120} /></div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Details</p>
                 <h3 className="text-[24px] font-black tracking-tight">{viewItem.name}</h3>
                 <p className="text-[12px] text-slate-400 font-medium mt-1">Type: <span className="text-indigo-400 uppercase">{viewItem.type}</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Price</p>
                <p className="text-[22px] font-black text-indigo-600 font-mono italic leading-none">₹{parseFloat(viewItem.price || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
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
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</p>
                   <p className={clsx("text-[13px] font-bold flex items-center gap-1.5", isAlertActive(viewItem) ? 'text-amber-600' : 'text-slate-800')}>
                     <AlertTriangle size={14} className={isAlertActive(viewItem) ? 'text-amber-500' : 'text-slate-400'}/> {viewItem.end_date || 'N/A'}
                   </p>
                 </div>
               </div>
            </div>

            {viewItem.description && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
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
  const [activeTab, setActiveTab] = useState('specs');

  const TABS = [
    { id: 'specs', label: 'Basic Info', icon: Target },
    { id: 'params', label: 'Settings', icon: Activity },
  ];

  useEffect(() => {
    if (product) setForm({ ...emptyForm, ...product });
    else setForm(emptyForm);
    setErrors({});
    setActiveTab('specs');
  }, [product, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = "Name is required";
    if (!form.price) e.price = "Price is required";
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
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={product ? 'Edit Product' : 'New Product'}
      footer={(
        <div className="flex justify-end items-center w-full px-1 gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSaving ? 'Saving...' : (product ? 'Save Changes' : 'Create Product')}</span>
          </button>
        </div>
      )}
    >
      <div className="flex h-full min-h-[600px] relative">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
          <div className="flex flex-col gap-2 sticky top-0">
            {TABS.map((t, idx) => (
              <div key={t.id}>
                <button
                  onClick={() => setActiveTab(t.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                    activeTab === t.id
                      ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {activeTab === t.id && (
                    <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                  )}
                  <t.icon className={clsx("h-4 w-4", activeTab === t.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{t.label}</span>
                </button>
                {idx < TABS.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 pl-10 overflow-y-auto">
          <div className="pb-20">
            {activeTab === 'specs' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <Label required>Product Name</Label>
                    <div className="relative">
                      <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={clsx(inputCls, "pl-11", errors.name && "border-rose-400")} placeholder="e.g. Website Design" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    {errors.name && <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">{errors.name}</p>}
                  </div>

                  <div>
                    <Label required>Price (₹)</Label>
                    <input type="number" className={clsx(inputCls, "font-black italic text-slate-900 text-lg")} placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                    {errors.price && <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">{errors.price}</p>}
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className={clsx(inputCls, "appearance-none")} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option>Service</option>
                      <option>Product</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <textarea className={clsx(inputCls, "min-h-[200px] resize-none")} placeholder="Enter description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'params' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label>Status</Label>
                    <select className={clsx(inputCls, "appearance-none")} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div className="flex items-center mt-6">
                    <label className={clsx("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer", form.enable_alert ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100")}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={form.enable_alert} onChange={e => setForm({ ...form, enable_alert: e.target.checked })} className="h-5 w-5 rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500" />
                        <div>
                          <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-none">Alerts</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Enable alerts for end date</p>
                        </div>
                      </div>
                      <AlertTriangle size={18} className={form.enable_alert ? "text-amber-500" : "text-slate-300"} />
                    </label>
                  </div>

                  <div>
                    <Label>Start Date</Label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="date" className={clsx(inputCls, "pl-11")} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="date" className={clsx(inputCls, "pl-11")} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
};
