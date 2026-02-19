import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Wallet, User, Shield, Bell, LayoutTemplate } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const defaultSettings = {
  company: {
    name: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
    logo: "",
    signature: "",
    tagline: "",
    terms: "",
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
  const [loading, setLoading] = useState(true);

  /* LOAD */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
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

  /* LOGO UPLOAD */
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.post('/settings/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSettings({
        ...settings,
        company: {
          ...settings.company,
          logo: response.data.url
        }
      });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Failed to upload logo", error);
      toast.error("Failed to upload logo");
    }
  };

  /* SIGNATURE UPLOAD */
  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('signature', file);

    try {
      const response = await api.post('/settings/upload-signature', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSettings({
        ...settings,
        company: {
          ...settings.company,
          signature: response.data.url
        }
      });
      toast.success("Signature uploaded. Click Save Settings to apply.");
    } catch (error) {
      console.error("Failed to upload signature", error);
      toast.error("Failed to upload signature. Use PNG, JPG or JPEG.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1 text-base md:text-lg">
          Manage your application preferences and configuration.
        </p>
      </div>

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
                    {settings.company.logo ? (
                      <img src={settings.company.logo} alt="Company Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="text-slate-300" size={32} />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="label">Company Logo</label>
                    <label className="inline-block">
                      <span className="sr-only">Choose profile photo</span>
                      <input type="file" onChange={handleLogoUpload} accept="image/*"
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
                    <p className="text-xs text-slate-400 mt-2 font-medium">Recommended: 200x200px (PNG/JPG)</p>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="h-20 w-40 rounded-xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {settings.company.signature ? (
                      <img src={settings.company.signature} alt="Signature" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Signature</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="label">Signature Upload</label>
                    <label className="inline-block">
                      <span className="sr-only">Choose signature image</span>
                      <input
                        type="file"
                        onChange={handleSignatureUpload}
                        accept=".png,.jpg,.jpeg"
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
                <Textarea label="Terms & Conditions" value={settings.company.terms}
                  onChange={v => setSettings({ ...settings, company: { ...settings.company, terms: v } })} />
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
