import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Leads from './pages/Leads';
import Reports from './pages/Reports';
import FollowUpCalendar from './pages/FollowUpCalendar';
import Income from "./pages/Income";
import BankAccounts from "./pages/BankAccounts";
import Expense from "./pages/Expense";
import Transaction from "./pages/Transaction";
import Settings from "./pages/Settings";
import User from "./pages/User";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              path="/customers"
              element={
                <Layout title="Customer Management">
                  <Customers />
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
            
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
