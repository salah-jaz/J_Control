<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\PlannerEvent;
use App\Models\Income;

class DashboardController extends Controller
{
    /**
     * Single dashboard API: returns all stats, recent invoices, today's income, and events.
     * One request loads the entire dashboard instantly.
     */
    public function stats()
    {
        $totalClients = \App\Models\Client::count();
        $activeClients = \App\Models\Client::count();
        $totalInvoices = Invoice::count();

        $totalRevenue = Invoice::where('status', 'Paid')->sum('grand_total');
        $pendingAmount = Invoice::where('status', 'Pending')->sum('grand_total');

        $today = now()->toDateString();
        $todayIncome = (float) Income::whereDate('received_date', $today)->sum('amount');

        $recentInvoices = Invoice::select(['id', 'invoice_number', 'client_name', 'date', 'grand_total', 'status'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($inv) {
                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_number,
                    'client_name' => $inv->client_name,
                    'date' => $inv->date?->format('Y-m-d'),
                    'amount' => (float) $inv->grand_total,
                    'status' => $inv->status,
                ];
            });

        // Today's planner events (commitments)
        $todaysEvents = PlannerEvent::whereDate('event_date', $today)
            ->orderBy('start_time')
            ->get(['id', 'title', 'event_date', 'start_time', 'end_time', 'category', 'priority', 'status']);

        // Monthly Revenue (Last 6 months)
        $monthlyRevenue = Invoice::where('status', 'Paid')
            ->selectRaw("DATE_FORMAT(date, '%b') as month, sum(grand_total) as revenue")
            ->groupBy('month')
            ->orderByRaw("MIN(date) ASC")
            ->take(6)
            ->get();

        // Invoice Status Distribution
        $invoiceStatusCounts = Invoice::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();

        return response()->json([
            'totalClients' => $totalClients,
            'activeClients' => $activeClients,
            'totalInvoices' => $totalInvoices,
            'totalRevenue' => $totalRevenue,
            'pendingAmount' => $pendingAmount,
            'todayIncome' => round($todayIncome, 2),
            'recentInvoices' => $recentInvoices,
            'monthlyRevenue' => $monthlyRevenue,
            'invoiceStatusCounts' => $invoiceStatusCounts,
            'todaysEvents' => $todaysEvents,
        ]);
    }
}
