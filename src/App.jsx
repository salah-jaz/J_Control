import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientManagement from './pages/ClientManagement';
import Invoices from './pages/Invoices';
import Quotations from './pages/Quotations';
import Leads from './pages/Leads';
import Reports from './pages/Reports';
import FollowUpCalendar from './pages/FollowUpCalendar';
import Income from "./pages/Income";
import BankAccounts from "./pages/BankAccounts";
import Expense from "./pages/Expense";
import Transaction from "./pages/Transaction";
import { Toaster, toast } from 'react-hot-toast';
import Settings from "./pages/Settings";
import User from "./pages/User";
import Products from "./pages/Products";
import PrintTemplateBuilder from "./pages/PrintTemplateBuilder";
import PrintTemplatesList from "./pages/PrintTemplatesList";
import Planner from "./pages/Planner";
import { useEffect, useRef } from 'react';
import { getTodayPlannerEvents } from './services/db';

const NOTIFICATION_SOUND_PATH = '/notification.mp3';
const REMINDER_SOUND_PATH = '/sounds/reminder.mp3';

function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_PATH);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Sound file may be missing; toast still shows
  }
}

function PlannerReminderListener() {
  const navigate = useNavigate();
  const location = useLocation();
  const triggeredRef = useRef(new Set());
  const reminderAudioRef = useRef(null);

  // Single Audio instance for reminder; path /sounds/reminder.mp3 (test: http://localhost:5173/sounds/reminder.mp3)
  useEffect(() => {
    reminderAudioRef.current = new Audio(REMINDER_SOUND_PATH);
    reminderAudioRef.current.volume = 1;
    return () => {
      if (reminderAudioRef.current) reminderAudioRef.current.pause();
    };
  }, []);

  // Unlock browser audio (required: browsers block sound until user interaction)
  useEffect(() => {
    const unlockAudio = () => {
      if (reminderAudioRef.current) {
        reminderAudioRef.current
          .play()
          .then(() => {
            reminderAudioRef.current.pause();
            reminderAudioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio, { once: true });
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  const playReminderSound = () => {
    if (!reminderAudioRef.current) return;
    reminderAudioRef.current.currentTime = 0;
    reminderAudioRef.current
      .play()
      .then(() => {})
      .catch((err) => console.log('Reminder audio blocked:', err));
  };

  useEffect(() => {
    let intervalId;
    let startTimeIntervalId;

    const pad = (n) => String(n).padStart(2, '0');

    const checkReminders = async () => {
      try {
        const events = await getTodayPlannerEvents();
        const now = new Date();

        events.forEach((ev) => {
          if (!ev.start_time || !ev.reminder_time) {
            return;
          }

          const key = `${ev.id}-${ev.reminder_time}`;
          if (triggeredRef.current.has(key)) {
            return;
          }

          const eventStart = new Date(`${ev.event_date}T${ev.start_time}`);
          if (Number.isNaN(eventStart.getTime())) {
            return;
          }

          const reminderMs = (ev.reminder_time || 0) * 60 * 1000;
          const reminderTime = new Date(eventStart.getTime() - reminderMs);

          if (now >= reminderTime && now <= eventStart) {
            triggeredRef.current.add(key);
            playReminderSound();

            const minutesUntil = Math.max(
              0,
              Math.round((eventStart.getTime() - now.getTime()) / 60000),
            );

            toast.custom(
              (t) => (
                <div
                  className={`max-w-sm w-full bg-white shadow-lg rounded-xl border border-gray-200 p-4 flex flex-col gap-2 ${t.visible ? 'animate-enter' : 'animate-leave'
                    }`}
                >
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
                    Reminder
                  </p>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {ev.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {minutesUntil > 0
                        ? `Starts in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`
                        : 'Starting now'}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                        navigate('/planner', { state: { focusEventId: ev.id } });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
                    >
                      View Event
                    </button>
                  </div>
                </div>
              ),
              { duration: 7000 },
            );
          }
        });
      } catch (error) {
        console.error('Failed to check planner reminders', error);
      }
    };

    // Only "X min before" reminder runs here. Event-time popup is shown only in Planner.jsx (one in-app modal + sound).
    checkReminders();
    intervalId = window.setInterval(checkReminders, 60000);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [navigate, location.key]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <PlannerReminderListener />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <Layout title="Dashboard">
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/leads"
              element={
                <Layout title="Lead Management">
                  <Leads />
                </Layout>
              }
            />
            <Route
              path="/clients"
              element={
                <Layout title="Client Management">
                  <ClientManagement />
                </Layout>
              }
            />
            <Route
              path="/products"
              element={
                <Layout title="Products & Services">
                  <Products />
                </Layout>
              }
            />
            <Route
              path="/quotations"
              element={
                <Layout title="Quotation Management">
                  <Quotations />
                </Layout>
              }
            />
            <Route
              path="/invoices"
              element={
                <Layout title="Invoices">
                  <Invoices />
                </Layout>
              }
            />
            <Route
              path="/income"
              element={
                <Layout title="Income">
                  <Income />
                </Layout>
              }
            />
            <Route
              path="/banks"
              element={
                <Layout title="Bank Accounts">
                  <BankAccounts />
                </Layout>
              }
            />
            <Route path="/expense" element={
              <Layout title="Expense">
                <Expense />
              </Layout>
            } />
            <Route path="/transaction" element={
              <Layout title="Transaction">
                <Transaction />
              </Layout>
            } />
            <Route path="/reports" element={
              <Layout title="Reports">
                <Reports />
              </Layout>
            } />
            <Route
              path="/planner"
              element={
                <Layout title="Planner">
                  <Planner />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout title="Settings">
                  <Settings />
                </Layout>
              }
            />
            <Route path="/user" element={
              <Layout title="User">
                <User />
              </Layout>
            } />
            <Route
              path="/print-templates"
              element={
                <Layout title="Print Templates">
                  <PrintTemplatesList />
                </Layout>
              }
            />
            <Route
              path="/print-templates/new"
              element={
                <Layout title="New Print Template">
                  <PrintTemplateBuilder />
                </Layout>
              }
            />
            <Route
              path="/print-templates/edit/:id"
              element={
                <Layout title="Edit Print Template">
                  <PrintTemplateBuilder />
                </Layout>
              }
            />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
