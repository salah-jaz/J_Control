import { useEffect, useState } from "react";
import { Building2, Wallet, User, Shield, Bell } from "lucide-react";
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
        // Merge with defaultSettings to ensure all keys exist if backend response is partial
        // or just use response.data if we trust it. 
        // Backend returns the full structure created in index() if missing.
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
      // Show loading toast or state if needed, but toast.promise is nice if available. 
      // Using simple toast for now.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-sans text-slate-800">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-gray-500 text-sm">
          Manage your application preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SIDEBAR */}
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
          <TabButton icon={<Building2 size={18} />} label="Company" id="company" tab={tab} setTab={setTab} />
          <TabButton icon={<Wallet size={18} />} label="Finance" id="finance" tab={tab} setTab={setTab} />
          <TabButton icon={<User size={18} />} label="Preferences" id="preferences" tab={tab} setTab={setTab} />
          <TabButton icon={<Shield size={18} />} label="Security" id="security" tab={tab} setTab={setTab} />
          <TabButton icon={<Bell size={18} />} label="Notifications" id="notifications" tab={tab} setTab={setTab} />
        </div>

        {/* CONTENT */}
        <div className="bg-white rounded-xl border shadow-sm p-6 md:col-span-3">
          {tab === "company" && (
            <Section title="Company Settings">
              <div className="md:col-span-2 flex items-center gap-6 mb-4">
                <div className="h-24 w-24 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                  {settings.company.logo ? (
                    <img src={settings.company.logo} alt="Company Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="text-slate-300" size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
                  <label className="inline-block">
                    <span className="sr-only">Choose profile photo</span>
                    <input type="file" onChange={handleLogoUpload} accept="image/*"
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100
                        cursor-pointer
                      "
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">Recommended: 200x200px (PNG/JPG)</p>
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
          <div className="flex justify-end mt-8">
            <button
              onClick={saveSettings}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Save Settings
            </button>
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
    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium
      ${tab === id ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"}`}
  >
    {icon}
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
    <input className="input-clean" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Textarea = ({ label, value, onChange }) => (
  <div className="md:col-span-2">
    <label className="label">{label}</label>
    <textarea className="input-clean h-24" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const Select = ({ label, value, options, onChange }) => (
  <div>
    <label className="label">{label}</label>
    <select className="input-clean" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 text-sm">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    {label}
  </label>
);
