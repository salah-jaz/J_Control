import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, Wallet, User, Shield, Bell, LayoutTemplate, Stamp } from "lucide-react";
import api, { getApiOrigin } from "../api/axios";
import { toAbsoluteImageUrl } from "../config/printTemplateModules";
import toast from "react-hot-toast";
import PageHeader from "../components/ui/PageHeader";

const defaultSettings = {
  company: {
    name: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
    logo: "",
    signature: "",
    authorized_signature_text: "",
    seal: "",
    tagline: "",
    terms: "",
    notes: "",
  },
  finance: {
    currency: "INR",
    gstEnabled: "Yes",
    gstPercent: "18",
    fyStart: "April",
  },
  preferences: {
    theme: "Light",
    language: "English",
    dateFormat: "DD/MM/YYYY",
  },
  security: {
    twoFactor: "No",
    autoLogout: "30",
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
};

export default function Settings() {
  const [tab, setTab] = useState("company");
  const [settings, setSettings] = useState(defaultSettings);

  /* LOAD */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data) {
          setSettings((prev) => ({
            ...prev,
            ...response.data,
            company: { ...defaultSettings.company, ...(response.data.company || {}) },
          }));
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        toast.error("Failed to load settings");
      }
    };
    fetchSettings();
  }, []);

  /* SAVE */
  const saveSettings = async () => {
    try {
      await api.post('/settings', settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Failed to save settings");
    }
  };

  /* Image upload: max 2MB, validate type before sending */
  const MAX_IMAGE_SIZE_KB = 2048;
  const LOGO_ACCEPT = ".png,.jpg,.jpeg,.gif,.svg,image/png,image/jpeg,image/gif,image/svg+xml";
  const SIGNATURE_SEAL_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg";

  const validateImageFile = (file, allowedExtensions, allowedMimeTypes) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const mime = (file.type || "").toLowerCase();
    const extOk = allowedExtensions.includes(ext);
    const mimeOk = mime && allowedMimeTypes.includes(mime);
    if (!extOk && !mimeOk) {
      return `Please choose an image file (${allowedExtensions.join(", ").toUpperCase()}). "${file.name}" was not recognized as a valid image.`;
    }
    const sizeKb = file.size / 1024;
    if (sizeKb > MAX_IMAGE_SIZE_KB) {
      return `File is too large (${Math.round(sizeKb)} KB). Maximum size is ${MAX_IMAGE_SIZE_KB} KB (2 MB).`;
    }
    return null;
  };

  const LOGO_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/svg+xml"];
  const SIGNATURE_SEAL_MIMES = ["image/png", "image/jpeg", "image/jpg"];

  const getUploadErrorMessage = (error) => {
    const errors = error?.response?.data?.errors;
    if (errors && typeof errors === "object") {
      const first = Object.values(errors).flat()[0];
      if (first) return first;
    }
    const msg = error?.response?.data?.message;
    if (msg) return msg;
    return null;
  };

  /* LOGO UPLOAD */
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateImageFile(file, ["png", "jpg", "jpeg", "gif", "svg"], LOGO_MIMES);
    if (err) {
      toast.error(err);
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const response = await api.post("/settings/upload-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSettings({
        ...settings,
        company: { ...settings.company, logo: response.data.url },
      });
      toast.success("Logo uploaded successfully. Click Save Settings to keep it.");
    } catch (error) {
      const msg = getUploadErrorMessage(error) || "Failed to upload logo. Use PNG, JPG, GIF or SVG (max 2 MB).";
      toast.error(msg);
      e.target.value = "";
    }
  };

  /* SIGNATURE UPLOAD */
  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateImageFile(file, ["png", "jpg", "jpeg"], SIGNATURE_SEAL_MIMES);
    if (err) {
      toast.error(err);
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("signature", file);
    try {
      const response = await api.post("/settings/upload-signature", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSettings({
        ...settings,
        company: { ...settings.company, signature: response.data.url },
      });
      toast.success("Signature uploaded. Click Save Settings to apply.");
    } catch (error) {
      const msg = getUploadErrorMessage(error) || "Failed to upload signature. Use PNG or JPG (max 2 MB).";
      toast.error(msg);
      e.target.value = "";
    }
  };

  /* SEAL UPLOAD */
  const handleSealUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateImageFile(file, ["png", "jpg", "jpeg"], SIGNATURE_SEAL_MIMES);
    if (err) {
      toast.error(err);
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("seal", file);
    try {
      const response = await api.post("/settings/upload-seal", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSettings({
        ...settings,
        company: { ...settings.company, seal: response.data.url },
      });
      toast.success("Seal uploaded. Click Save Settings to apply.");
    } catch (error) {
      const msg = getUploadErrorMessage(error) || "Failed to upload seal. Use PNG or JPG (max 2 MB).";
      toast.error(msg);
      e.target.value = "";
    }
  };

  const apiOrigin = getApiOrigin();
  const logoDisplayUrl = useMemo(() => toAbsoluteImageUrl(settings?.company?.logo, apiOrigin), [settings?.company?.logo, apiOrigin]);
  const signatureDisplayUrl = useMemo(() => toAbsoluteImageUrl(settings?.company?.signature, apiOrigin), [settings?.company?.signature, apiOrigin]);
  const sealDisplayUrl = useMemo(() => toAbsoluteImageUrl(settings?.company?.seal, apiOrigin), [settings?.company?.seal, apiOrigin]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <PageHeader
        title="Settings"
        subtitle="Manage your application preferences and configuration."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR */}
        <div className="card h-fit p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible hide-scrollbar sticky top-[72px] z-10 bg-white shadow-sm border border-gray-100">
          <TabButton icon={<Building2 size={18} />} label="Company" id="company" tab={tab} setTab={setTab} />
          <TabButton icon={<Wallet size={18} />} label="Finance" id="finance" tab={tab} setTab={setTab} />
          <TabButton icon={<User size={18} />} label="Preferences" id="preferences" tab={tab} setTab={setTab} />
          <TabButton icon={<Shield size={18} />} label="Security" id="security" tab={tab} setTab={setTab} />
          <TabButton icon={<Bell size={18} />} label="Notifications" id="notifications" tab={tab} setTab={setTab} />
          <Link to="/print-templates" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:w-full text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            <LayoutTemplate size={18} className="text-slate-400" />
            Print Templates
          </Link>
        </div>

        {/* CONTENT */}
        <div className="lg:col-span-3">
          <div className="card min-h-[600px] flex flex-col">
            {tab === "company" && (
              <Section title="Company Settings">
                <div className="md:col-span-2 flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="h-24 w-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {logoDisplayUrl ? (
                      <img src={logoDisplayUrl} alt="Company Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="text-slate-300" size={32} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="label">Company Logo</label>
                    <label className="inline-block">
                      <span className="sr-only">Choose profile photo</span>
                      <input type="file" onChange={handleLogoUpload} accept={LOGO_ACCEPT}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2.5 file:px-6
                        file:rounded-xl file:border-0
                        file:text-sm file:font-bold
                        file:bg-brand-50 file:text-brand-700
                        hover:file:bg-brand-100
                        transition-all
                        cursor-pointer
                      "
                      />
                    </label>
                    <p className="text-xs text-slate-400 mt-2 font-medium">PNG, JPG, GIF or SVG. Max 2 MB. Recommended: 200×200px.</p>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="h-20 w-40 rounded-xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {signatureDisplayUrl ? (
                        <img src={signatureDisplayUrl} alt="Signature" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">Signature</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="label">Signature Upload</label>
                      <label className="inline-block">
                        <span className="sr-only">Choose signature image</span>
                        <input
                          type="file"
                          onChange={handleSignatureUpload}
                          accept={SIGNATURE_SEAL_ACCEPT}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2.5 file:px-6
                            file:rounded-xl file:border-0
                            file:text-sm file:font-bold
                            file:bg-brand-50 file:text-brand-700
                            hover:file:bg-brand-100
                            transition-all cursor-pointer
                          "
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-2 font-medium">PNG, JPG or JPEG. Shown on invoice in Authorized Sign section.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="h-20 w-40 rounded-xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {sealDisplayUrl ? (
                        <img src={sealDisplayUrl} alt="Seal" className="h-full w-full object-contain" />
                      ) : (
                        <Stamp className="text-slate-300" size={28} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="label">Seal Upload</label>
                      <label className="inline-block">
                        <span className="sr-only">Choose seal image</span>
                        <input
                          type="file"
                          onChange={handleSealUpload}
                          accept={SIGNATURE_SEAL_ACCEPT}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2.5 file:px-6
                            file:rounded-xl file:border-0
                            file:text-sm file:font-bold
                            file:bg-brand-50 file:text-brand-700
                            hover:file:bg-brand-100
                            transition-all cursor-pointer
                          "
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-2 font-medium">PNG or JPG only. Max 2 MB. Company seal shown next to signature on documents.</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <label className="label block mb-2">Authorized Signature (Text)</label>
                  <input
                    type="text"
                    value={settings.company.authorized_signature_text ?? ''}
                    onChange={e => setSettings({ ...settings, company: { ...settings.company, authorized_signature_text: e.target.value } })}
                    placeholder="e.g. Authorized Signatory, Director"
                    className="input w-full"
                  />
                  <p className="text-xs text-slate-400 mt-2 font-medium">Name or title shown below signature on invoices. Add this field in the invoice print template to display it.</p>
                </div>

                <Input label="Company Name" value={settings.company.name}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, name: v } })} />
                <Input label="Email" value={settings.company.email}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, email: v } })} />
                <Input label="Phone" value={settings.company.phone}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, phone: v } })} />
                <Input label="GST Number" value={settings.company.gst}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, gst: v } })} />
                <Textarea label="Address" value={settings.company.address}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, address: v } })} />
                <Input label="Company Tagline" value={settings.company.tagline}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, tagline: v } })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Textarea label="Terms & Conditions" value={settings.company.terms}
                    onChange={v => setSettings({ ...settings, company: { ...settings.company, terms: v } })} />
                  <Textarea label="Notes" value={settings.company.notes}
                    onChange={v => setSettings({ ...settings, company: { ...settings.company, notes: v } })} />
                </div>
              </Section>
            )}

            {tab === "finance" && (
              <Section title="Finance Settings">
                <Select label="Currency" value={settings.finance.currency}
                  options={["INR", "USD", "EUR"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, currency: v } })} />
                <Select label="GST Enabled" value={settings.finance.gstEnabled}
                  options={["Yes", "No"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, gstEnabled: v } })} />
                <Input label="GST %" value={settings.finance.gstPercent}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, gstPercent: v } })} />
                <Select label="Financial Year Start"
                  value={settings.finance.fyStart}
                  options={["January", "April"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, fyStart: v } })} />
              </Section>
            )}

            {tab === "preferences" && (
              <Section title="User Preferences">
                <Select label="Theme" value={settings.preferences.theme}
                  options={["Light", "Dark"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, theme: v } })} />
                <Select label="Language" value={settings.preferences.language}
                  options={["English", "Tamil"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, language: v } })} />
                <Select label="Date Format"
                  value={settings.preferences.dateFormat}
                  options={["DD/MM/YYYY", "MM/DD/YYYY"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, dateFormat: v } })} />
              </Section>
            )}

            {tab === "security" && (
              <Section title="Security">
                <Select label="Two Factor Authentication"
                  value={settings.security.twoFactor}
                  options={["Yes", "No"]}
                  onChange={v => setSettings({ ...settings, security: { ...settings.security, twoFactor: v } })} />
                <Input label="Auto Logout (minutes)"
                  value={settings.security.autoLogout}
                  onChange={v => setSettings({ ...settings, security: { ...settings.security, autoLogout: v } })} />
              </Section>
            )}

            {tab === "notifications" && (
              <Section title="Notifications">
                <Checkbox label="Email Notifications"
                  checked={settings.notifications.email}
                  onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, email: v } })} />
                <Checkbox label="SMS Notifications"
                  checked={settings.notifications.sms}
                  onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, sms: v } })} />
                <Checkbox label="Push Notifications"
                  checked={settings.notifications.push}
                  onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, push: v } })} />
              </Section>
            )}

            {/* SAVE */}
            <div className="flex justify-end mt-auto pt-8 border-t border-gray-100">
              <button
                onClick={saveSettings}
                className="btn-primary shadow-lg shadow-brand-500/30 min-w-[150px]"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* SMALL COMPONENTS */

const TabButton = ({ icon, label, id, tab, setTab }) => (
  <button
    onClick={() => setTab(id)}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap lg:w-full
      ${tab === id ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
  >
    <span className={tab === id ? "text-brand-600" : "text-slate-400"}>{icon}</span>
    {label}
  </button>
);

const Section = ({ title, children }) => (
  <div className="space-y-5">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Input = ({ label, value, onChange }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Textarea = ({ label, value, onChange }) => (
  <div className="md:col-span-2">
    <label className="label">{label}</label>
    <textarea className="input h-32" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Select = ({ label, value, options, onChange }) => (
  <div>
    <label className="label">{label}</label>
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer group">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-200 bg-slate-50 checked:bg-brand-600 checked:border-brand-600 transition-all"
      />
      <svg className="absolute w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    {label}
  </label>
);
