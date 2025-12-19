<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;


class DashboardController extends Controller
{
    public function stats()
    {
        $totalClients = \App\Models\Client::count();
        $activeClients = \App\Models\Client::count(); // Assuming all clients are active as there is no status column
        $totalInvoices = Invoice::count();
        
        // Calculate revenue based on grand_total (which is computed)
        // Since grand_total is an accessor, we can't sum() it directly in SQL easily without raw query or iterating.
        // For performance on large datasets, raw SQL is better, but for now PHP iteration is fine or DB raw.
        // Let's use DB raw for correctness and performance.
        
        // Formula: amount + (amount * gst / 100) - discount
        // Now using materialized grand_total column
        $totalRevenue = Invoice::where('status', 'Paid')
            ->sum('grand_total');

        $pendingAmount = Invoice::where('status', 'Pending')
            ->sum('grand_total');

        $recentInvoices = Invoice::latest()->take(5)->get();

        return response()->json([
            'totalClients' => $totalClients,
            'activeClients' => $activeClients,
            'totalInvoices' => $totalInvoices,
            'totalRevenue' => $totalRevenue,
            'pendingAmount' => $pendingAmount,
            'recentInvoices' => $recentInvoices
        ]);
    }
}
