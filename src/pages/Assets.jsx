import { useEffect, useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  X,
  Layers,
  IndianRupee,
  Wallet,
  Hash,
  Package,
  Calendar,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";
import { TableSkeleton } from "../components/Skeleton";

import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
} from "../services/assetService";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";

const emptyForm = {
  product_name: "",
  asset_number: "",
  product_count: "",
  product_value: "",
};

// Sleek Metric Stat Card matching J-Control Enterprise UI
const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
    <div
      className={clsx(
        "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300",
        colorClass
      )}
    >
      <Icon size={22} className="text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
        {title}
      </p>
      <p className="text-[22px] font-bold text-slate-900 leading-none mt-1.5 truncate">
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

export default function Assets() {
  const queryClient = useQueryClient();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await getAssets();
      const records = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      setData(records);
    } catch (err) {
      console.error("Failed to load assets", err);
      toast.error("Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  };

  // Summary statistics calculated dynamically from current dataset
  const stats = useMemo(() => {
    const totalAssets = data.length;
    let totalCount = 0;
    let totalValue = 0;
    let totalValuation = 0;

    data.forEach((item) => {
      const count = Number(item.product_count ?? item.productCount);
      const val = Number(item.product_value ?? item.productValue);

      if (!isNaN(count) && count > 0) {
        totalCount += count;
      }
      if (!isNaN(val) && val > 0) {
        totalValue += val;
      }
      if (!isNaN(count) && count > 0 && !isNaN(val) && val > 0) {
        totalValuation += count * val;
      } else if (!isNaN(val) && val > 0) {
        totalValuation += val;
      }
    });

    return {
      totalAssets,
      totalCount,
      totalValue,
      totalValuation,
    };
  }, [data]);

  // Real-time search filter matching Product Name and Asset Number
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const name = String(item.product_name ?? item.productName ?? "").toLowerCase();
      const num = String(item.asset_number ?? item.assetNumber ?? "").toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [data, searchQuery]);

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setIsSaving(false);
    setOpenForm(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item.id);
    setForm({
      product_name: item.product_name ?? item.productName ?? "",
      asset_number: item.asset_number ?? item.assetNumber ?? "",
      product_count: item.product_count ?? item.productCount ?? "",
      product_value: item.product_value ?? item.productValue ?? "",
    });
    setIsSaving(false);
    setOpenForm(true);
  };

  const handleOpenView = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateAsset(editId, form);
        toast.success("Asset updated successfully");
      } else {
        await createAsset(form);
        toast.success("Asset created successfully");
      }

      invalidateCache("/assets");
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      setOpenForm(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save asset", err);
      const msg = err.response?.data?.message || "Failed to save asset";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;

    try {
      await deleteAsset(id);
      toast.success("Asset deleted successfully");
      invalidateCache("/assets");
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      loadData();
      if (openView && viewItem?.id === id) {
        setOpenView(false);
      }
    } catch (err) {
      console.error("Failed to delete asset", err);
      const msg = err.response?.data?.message || "Failed to delete asset";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      {/* Top Header Section */}
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Assets"
          subtitle="Manage and track company assets, product quantities, and valuations."
          primaryAction={
            <button
              onClick={handleOpenAdd}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group"
            >
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>Add Asset</span>
            </button>
          }
        />

        {/* Dynamic Summary Statistic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          <StatCard
            title="Total Assets"
            value={stats.totalAssets.toLocaleString()}
            icon={Boxes}
            colorClass="bg-slate-900"
            subtitle="Registered asset records"
          />
          <StatCard
            title="Product Count"
            value={stats.totalCount.toLocaleString()}
            icon={Layers}
            colorClass="bg-indigo-600"
            subtitle="Cumulative inventory items"
          />
          <StatCard
            title="Unit Values Sum"
            value={`₹${stats.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={IndianRupee}
            colorClass="bg-emerald-600"
            subtitle="Total unit value sum"
          />
          <StatCard
            title="Total Valuation"
            value={`₹${stats.totalValuation.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={Wallet}
            colorClass="bg-violet-600"
            subtitle="Calculated total holding worth"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Search & Filter Bar */}
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[260px] max-w-md">
            <div className="relative group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by Product Name or Asset Number..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-900">{filteredData.length}</strong> of{" "}
              <strong className="text-slate-900">{data.length}</strong> assets
            </span>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-72">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">
                    Asset Number
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-36">
                    Product Count
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">
                    Product Value
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-48">
                    Total Valuation
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">
                      Loading Assets Registry...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16">
                      <EmptyState
                        icon={Boxes}
                        title={searchQuery ? "No matching assets found" : "No assets recorded yet"}
                        description={
                          searchQuery
                            ? "Try adjusting your search criteria to find what you're looking for."
                            : "Click 'Add Asset' above to register your first asset item."
                        }
                        action={
                          !searchQuery && (
                            <button
                              onClick={handleOpenAdd}
                              className="btn-primary inline-flex items-center gap-2 mt-2 shadow-md shadow-indigo-500/20"
                            >
                              <Plus size={16} />
                              <span>Add First Asset</span>
                            </button>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const count = item.product_count ?? item.productCount;
                    const value = item.product_value ?? item.productValue;
                    const numCount = Number(count);
                    const numVal = Number(value);
                    const hasCount = count !== "" && count !== null && !isNaN(numCount);
                    const hasVal = value !== "" && value !== null && !isNaN(numVal);
                    const lineValuation = hasCount && hasVal ? numCount * numVal : hasVal ? numVal : null;

                    const productName = item.product_name ?? item.productName;
                    const assetNumber = item.asset_number ?? item.assetNumber;

                    return (
                      <tr
                        key={item.id}
                        className="group hover:bg-slate-50/80 transition-all duration-200"
                      >
                        {/* Product Name Column */}
                        <td className="px-6 lg:px-8 py-4.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-100 rounded-xl flex items-center justify-center text-[12px] font-black text-indigo-700 shadow-inner shrink-0">
                              {productName ? productName[0]?.toUpperCase() : "A"}
                            </div>
                            <div className="min-w-0">
                              <span
                                className="text-[13px] font-bold text-slate-900 block truncate"
                                title={productName || ""}
                              >
                                {productName || (
                                  <span className="text-slate-400 font-normal italic">
                                    — (Not specified)
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Asset Number Column */}
                        <td className="px-6 py-4.5">
                          {assetNumber ? (
                            <span className="font-mono text-[12px] font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-lg tracking-tight inline-block truncate max-w-full">
                              {assetNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs italic">—</span>
                          )}
                        </td>

                        {/* Product Count Column */}
                        <td className="px-6 py-4.5 text-right">
                          {hasCount ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[13px] font-bold font-mono">
                              {numCount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs italic">—</span>
                          )}
                        </td>

                        {/* Product Value Column */}
                        <td className="px-6 py-4.5 text-right">
                          {hasVal ? (
                            <span className="font-mono text-[14px] font-bold text-slate-800">
                              ₹{numVal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs italic">—</span>
                          )}
                        </td>

                        {/* Total Valuation Column */}
                        <td className="px-6 py-4.5 text-right">
                          {lineValuation !== null ? (
                            <span className="font-mono text-[14px] font-black text-emerald-600">
                              ₹{lineValuation.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs italic">—</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 lg:px-8 py-4.5 text-right">
                          <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <ActionIconButton
                              onClick={() => handleOpenView(item)}
                              title="View Details"
                              icon={Eye}
                              tone="view"
                            />
                            <ActionIconButton
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Asset"
                              icon={Edit2}
                              tone="edit"
                            />
                            <ActionIconButton
                              onClick={() => handleDelete(item.id)}
                              title="Delete Asset"
                              icon={Trash2}
                              tone="delete"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SlideOver Drawer for Add / Edit Asset */}
      <SlideOver
        isOpen={openForm}
        onClose={() => !isSaving && setOpenForm(false)}
        title={editId ? "Edit Asset" : "Add Asset"}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setOpenForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editId ? "Update Asset" : "Save Asset"}</span>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 mb-6">
            <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 font-medium">
              All four fields below are optional. You can enter whichever details are available and update the record at any time.
            </div>
          </div>

          {/* Field 1: Product Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-indigo-600" />
                <span>Product Name</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Dell UltraSharp 27 Monitor"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Enter the name, description, or title of the asset item.
            </p>
          </div>

          {/* Field 2: Asset Number */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={14} className="text-indigo-600" />
                <span>Asset Number</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                Optional
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. AST-2026-0042"
              value={form.asset_number}
              onChange={(e) => setForm({ ...form, asset_number: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-mono font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Unique internal asset code, tag, barcode, or tracking identifier.
            </p>
          </div>

          {/* Field 3: Product Count */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                <span>Product Count</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                Optional
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 10"
              value={form.product_count}
              onChange={(e) => setForm({ ...form, product_count: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-mono font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Total quantity or number of units held for this asset.
            </p>
          </div>

          {/* Field 4: Product Value */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee size={14} className="text-indigo-600" />
                <span>Product Value</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                Optional
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 45000.00"
                value={form.product_value}
                onChange={(e) => setForm({ ...form, product_value: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-[13px] font-mono font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Unit monetary cost or assessed valuation per unit.
            </p>
          </div>
        </form>
      </SlideOver>

      {/* View Asset Detail Modal */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Boxes size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Asset Details
                  </h3>
                  <p className="text-xs font-mono text-indigo-600">
                    ID #{viewItem.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenView(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Highlight Card */}
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white shadow-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                  Product Valuation
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-black font-mono">
                    ₹
                    {(
                      (Number(viewItem.product_count ?? viewItem.productCount) || 1) *
                      (Number(viewItem.product_value ?? viewItem.productValue) || 0)
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-medium text-indigo-200">
                    Total Estimated
                  </span>
                </div>
              </div>

              {/* Detail Rows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Product Name
                  </span>
                  <span className="text-sm font-bold text-slate-800 break-words">
                    {(viewItem.product_name ?? viewItem.productName) || (
                      <span className="text-slate-400 font-normal italic">— None</span>
                    )}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Asset Number
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-600 break-words">
                    {(viewItem.asset_number ?? viewItem.assetNumber) || (
                      <span className="text-slate-400 font-normal italic">— None</span>
                    )}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Product Count
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-800">
                    {(viewItem.product_count ?? viewItem.productCount) !== "" &&
                    (viewItem.product_count ?? viewItem.productCount) !== null
                      ? Number(viewItem.product_count ?? viewItem.productCount).toLocaleString()
                      : <span className="text-slate-400 font-normal italic">— None</span>}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Product Value
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-800">
                    {(viewItem.product_value ?? viewItem.productValue) !== "" &&
                    (viewItem.product_value ?? viewItem.productValue) !== null
                      ? `₹${Number(viewItem.product_value ?? viewItem.productValue).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : <span className="text-slate-400 font-normal italic">— None</span>}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Created: {viewItem.createdAt ? new Date(viewItem.createdAt).toLocaleDateString() : "—"}
                </span>
                <span>
                  Updated: {viewItem.updatedAt ? new Date(viewItem.updatedAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            {/* Modal Footer with Quick Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDelete(viewItem.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = viewItem;
                    setOpenView(false);
                    handleOpenEdit(itemToEdit);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors flex items-center gap-1.5"
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenView(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
