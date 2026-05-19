import { useEffect, useState, useMemo } from "react";
import clsx from "clsx";
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

  const TABS = [
    { id: 'company', label: 'Corporate Registry', icon: Building2 },
    { id: 'finance', label: 'Treasury Defaults', icon: Wallet },
    { id: 'preferences', label: 'Personalization', icon: User },
    { id: 'security', label: 'Security Protocols', icon: Shield },
    { id: 'notifications', label: 'Alert Channels', icon: Bell },
  ];

  return (
    <div className="p-8 md:p-12 animate-in fade-in duration-700 space-y-12 bg-white min-h-screen">
      {/* HEADER */}
      <PageHeader
        title="Administrative Infrastructure"
        subtitle="Global governance, financial protocols, and system-wide personalization parameters."
      />

      <div className="flex relative">
        {/* Sidebar Navigation */}
        <div className="w-72 border-r-2 border-slate-100 pr-10 shrink-0 hidden lg:block">
          <div className="flex flex-col gap-2 sticky top-8">
            {TABS.map((t, idx) => (
              <div key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                    tab === t.id
                      ? "bg-slate-900 text-white shadow-2xl shadow-slate-200"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {tab === t.id && (
                    <div className="absolute -right-[42px] top-4 bottom-4 w-1 bg-slate-900 rounded-l-full z-10" />
                  )}
                  <t.icon className={clsx("h-4 w-4", tab === t.id ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{t.label}</span>
                </button>
                {idx < TABS.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
              </div>
            ))}
            <div className="mt-8 pt-8 border-t border-slate-50">
              <Link to="/print-templates" className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all group">
                <LayoutTemplate size={18} className="group-hover:text-indigo-600 transition-colors" />
                <span>Doc Templates</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 lg:pl-16">
          <div className="max-w-5xl space-y-16 pb-32">
            {tab === "company" && (
              <Section title="Corporate Identity & Assets">
                <div className="md:col-span-2 space-y-8">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-10 p-10 bg-slate-50/50 rounded-[32px] border-2 border-slate-100 group relative overflow-hidden transition-all hover:bg-white hover:border-slate-200 shadow-sm">
                    <div className="h-40 w-40 rounded-[28px] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
                      {logoDisplayUrl ? (
                        <img src={logoDisplayUrl} alt="Company Logo" className="h-full w-full object-contain p-4" />
                      ) : (
                        <Building2 className="text-slate-200" size={64} />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Corporate Mark (Logo)</label>
                      <label className="block relative">
                        <input type="file" onChange={handleLogoUpload} accept={LOGO_ACCEPT}
                          className="block w-full text-sm text-slate-500
                          file:mr-6 file:py-3 file:px-8
                          file:rounded-2xl file:border-0
                          file:text-[12px] file:font-black file:uppercase file:tracking-widest
                          file:bg-slate-900 file:text-white
                          hover:file:bg-slate-800
                          transition-all
                          cursor-pointer
                        "
                        />
                      </label>
                      <p className="text-[11px] text-slate-400 mt-6 font-bold uppercase tracking-wide leading-relaxed">System-wide branding asset. Support for SVG, PNG, JPG (Max 2MB).<br/>Optimized for 400x400px geometry.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6 p-10 bg-slate-50/50 rounded-[32px] border-2 border-slate-100 hover:bg-white hover:border-slate-200 transition-all shadow-sm">
                      <div className="h-32 w-full rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group-hover:bg-slate-50 transition-colors">
                        {signatureDisplayUrl ? (
                          <img src={signatureDisplayUrl} alt="Signature" className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic opacity-50 underline decoration-slate-200 underline-offset-8">Authorized Signature</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Verification Signature</label>
                        <input
                          type="file"
                          onChange={handleSignatureUpload}
                          accept={SIGNATURE_SEAL_ACCEPT}
                          className="block w-full text-sm text-slate-400
                            file:mr-4 file:py-2.5 file:px-6
                            file:rounded-xl file:border-0
                            file:text-[11px] file:font-black file:uppercase file:tracking-widest
                            file:bg-slate-200 file:text-slate-700
                            hover:file:bg-slate-300
                            transition-all cursor-pointer
                          "
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 p-10 bg-slate-50/50 rounded-[32px] border-2 border-slate-100 hover:bg-white hover:border-slate-200 transition-all shadow-sm">
                      <div className="h-32 w-full rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner group-hover:bg-slate-50 transition-colors">
                        {sealDisplayUrl ? (
                          <img src={sealDisplayUrl} alt="Seal" className="h-full w-full object-contain p-4" />
                        ) : (
                          <Stamp className="text-slate-200" size={48} />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Official Corporate Seal</label>
                        <input
                          type="file"
                          onChange={handleSealUpload}
                          accept={SIGNATURE_SEAL_ACCEPT}
                          className="block w-full text-sm text-slate-400
                            file:mr-4 file:py-2.5 file:px-6
                            file:rounded-xl file:border-0
                            file:text-[11px] file:font-black file:uppercase file:tracking-widest
                            file:bg-slate-200 file:text-slate-700
                            hover:file:bg-slate-300
                            transition-all cursor-pointer
                          "
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-12 mt-12">
                  <div className="grid grid-cols-2 gap-10">
                    <Input label="Authorized Signatory Designation" value={settings.company.authorized_signature_text ?? ''}
                      placeholder="e.g. Director / Managing Partner"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, authorized_signature_text: v } })} />
                    <Input label="Official Corporate Designation" value={settings.company.name}
                      placeholder="e.g. J-Control Enterprise Solutions"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, name: v } })} />
                    <Input label="Registry Email Protocol" value={settings.company.email}
                      placeholder="corporate@j-control.com"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, email: v } })} />
                    <Input label="Direct Communication Line" value={settings.company.phone}
                      placeholder="+91 XXXXX XXXXX"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, phone: v } })} />
                    <Input label="Tax Identification (GST)" value={settings.company.gst}
                      placeholder="29AAAAA0000A1Z5"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, gst: v } })} />
                    <Input label="Systemic Corporate Tagline" value={settings.company.tagline}
                      placeholder="Innovating Governance Dynamics"
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, tagline: v } })} />
                  </div>
                  
                  <div className="space-y-10">
                    <Textarea label="Corporate Headquarters / Registry Address" value={settings.company.address}
                      placeholder="123 Corporate Plaza, Financial District..."
                      onChange={v => setSettings({ ...settings, company: { ...settings.company, address: v } })} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <Textarea label="Standard Terms & Conditions Protocol" value={settings.company.terms}
                        placeholder="Legal boilerplate for all document generations..."
                        onChange={v => setSettings({ ...settings, company: { ...settings.company, terms: v } })} />
                      <Textarea label="Internal Administrative Context" value={settings.company.notes}
                        placeholder="Private notes regarding registry profile..."
                        onChange={v => setSettings({ ...settings, company: { ...settings.company, notes: v } })} />
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {tab === "finance" && (
              <Section title="Financial Governance & Defaults">
                <Select label="Base Functional Currency" value={settings.finance.currency}
                  options={["INR", "USD", "EUR"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, currency: v } })} />
                <Select label="GST Compliance Module" value={settings.finance.gstEnabled}
                  options={["Yes", "No"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, gstEnabled: v } })} />
                <Input label="Standard Regulatory Rate (%)" value={settings.finance.gstPercent}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, gstPercent: v } })} />
                <Select label="Fiscal Year Initialization"
                  value={settings.finance.fyStart}
                  options={["January", "April"]}
                  onChange={v => setSettings({ ...settings, finance: { ...settings.finance, fyStart: v } })} />
              </Section>
            )}

            {tab === "preferences" && (
              <Section title="Interface Personalization">
                <Select label="Visual Environment Mode" value={settings.preferences.theme}
                  options={["Light", "Dark"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, theme: v } })} />
                <Select label="Localization Protocol" value={settings.preferences.language}
                  options={["English", "Tamil"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, language: v } })} />
                <Select label="Temporal Display Format"
                  value={settings.preferences.dateFormat}
                  options={["DD/MM/YYYY", "MM/DD/YYYY"]}
                  onChange={v => setSettings({ ...settings, preferences: { ...settings.preferences, dateFormat: v } })} />
              </Section>
            )}

            {tab === "security" && (
              <Section title="Security Governance">
                <Select label="Multi-Factor Authentication"
                  value={settings.security.twoFactor}
                  options={["Yes", "No"]}
                  onChange={v => setSettings({ ...settings, security: { ...settings.security, twoFactor: v } })} />
                <Input label="Automated Session Expiry (min)"
                  value={settings.security.autoLogout}
                  onChange={v => setSettings({ ...settings, security: { ...settings.security, autoLogout: v } })} />
              </Section>
            )}

            {tab === "notifications" && (
              <Section title="Communication Channels">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-10 bg-slate-50/50 p-10 rounded-[32px] border-2 border-slate-100">
                  <Checkbox label="Registry Email Pipeline"
                    checked={settings.notifications.email}
                    onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, email: v } })} />
                  <Checkbox label="Cellular SMS Broadcasts"
                    checked={settings.notifications.sms}
                    onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, sms: v } })} />
                  <Checkbox label="Real-time Push Vectors"
                    checked={settings.notifications.push}
                    onChange={v => setSettings({ ...settings, notifications: { ...settings.notifications, push: v } })} />
                </div>
              </Section>
            )}

            {/* SAVE ACTION */}
            <div className="flex justify-end pt-12 border-t border-slate-100">
              <button
                onClick={saveSettings}
                className="px-16 py-4 bg-slate-900 text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95"
              >
                Commit Infrastructure Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="flex flex-col gap-2 border-b-2 border-slate-100 pb-6">
      <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em]">{title}</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">{children}</div>
  </div>
);

const Input = ({ label, value, onChange, placeholder }) => (
  <div className="group">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-slate-900 transition-colors">{label}</label>
    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition-all" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder }) => (
  <div className="md:col-span-2 group">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-slate-900 transition-colors">{label}</label>
    <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-[14px] font-bold text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition-all h-48 resize-none shadow-inner" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Select = ({ label, value, options, onChange }) => (
  <div className="group">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-focus-within:text-slate-900 transition-colors">{label}</label>
    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition-all appearance-none" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-4 cursor-pointer group select-none">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white checked:bg-slate-900 checked:border-slate-900 transition-all"
      />
      <svg className="absolute w-4 h-4 opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{label}</span>
  </label>
);
