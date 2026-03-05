<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\PlannerEvent;


class DashboardController extends Controller
{
    public function stats()
    {
        $totalClients = \App\Models\Client::count();
        $activeClients = \App\Models\Client::count();
        $totalInvoices = Invoice::count();
        
        $totalRevenue = Invoice::where('status', 'Paid')->sum('grand_total');
        $pendingAmount = Invoice::where('status', 'Pending')->sum('grand_total');
        
        $recentInvoices = Invoice::latest()->take(5)->get();

        // Today's planner events (commitments)
        $today = now()->toDateString();
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
            'recentInvoices' => $recentInvoices,
            'monthlyRevenue' => $monthlyRevenue,
            'invoiceStatusCounts' => $invoiceStatusCounts,
            'todaysEvents' => $todaysEvents,
        ]);
    }
}
