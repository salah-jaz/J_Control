import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { Toaster } from 'react-hot-toast';
import Settings from "./pages/Settings";
import User from "./pages/User";
import Products from "./pages/Products";
import PrintTemplateBuilder from "./pages/PrintTemplateBuilder";
import PrintTemplatesList from "./pages/PrintTemplatesList";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
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
