<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use Illuminate\Http\Request;

class AgreementController extends Controller
{
    /**
     * Public API endpoint to get next agreement number
     */
    public function nextAgreementNo()
    {
        return response()->json(['agreement_no' => self::generateNextNumber()]);
    }

    /**
     * Helper to compute next agreement number: AG-YYYY-NNN
     */
    public static function generateNextNumber(): string
    {
        $year = date('Y');
        $last = Agreement::where('agreement_no', 'like', "AG-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();
        $seq = $last ? (int) substr($last->agreement_no, -3) + 1 : 1;
        return sprintf('AG-%s-%03d', $year, $seq);
    }

    public function index(Request $request)
    {
        $query = Agreement::with('client');

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('quotation_id')) {
            $query->where('quotation_id', $request->quotation_id);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('agreement_no', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhereHas('client', function ($c) use ($search) {
                        $c->where('company_name', 'like', "%{$search}%")
                            ->orWhere('client_name', 'like', "%{$search}%");
                    });
            });
        }

        $agreements = $query->orderBy('created_at', 'desc')->get();

        $summary = [
            'total' => Agreement::count(),
            'draft' => Agreement::where('status', 'Draft')->count(),
            'sent' => Agreement::where('status', 'Sent')->count(),
            'signed' => Agreement::where('status', 'Signed')->count(),
            'expired' => Agreement::where('status', 'Expired')->count(),
        ];

        return response()->json([
            'agreements' => $agreements,
            'summary' => $summary,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'agreement_no' => 'nullable|string',
            'title' => 'required|string',
            'tagline' => 'nullable|string',
            'override_company_name' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'quotation_id' => 'nullable|exists:quotations,id',
            'date' => 'required|date',
            'status' => 'required|in:Draft,Sent,Signed,Expired',
            'content' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if (empty($validated['agreement_no'])) {
            $validated['agreement_no'] = self::generateNextNumber();
        }

        $agreement = Agreement::create($validated);

        return $agreement->load('client');
    }

    public function show(Agreement $agreement)
    {
        return $agreement->load('client');
    }

    public function update(Request $request, Agreement $agreement)
    {
        $validated = $request->validate([
            'agreement_no' => 'nullable|string',
            'title' => 'required|string',
            'tagline' => 'nullable|string',
            'override_company_name' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'quotation_id' => 'nullable|exists:quotations,id',
            'date' => 'required|date',
            'status' => 'required|in:Draft,Sent,Signed,Expired',
            'content' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $agreement->update($validated);

        return $agreement->load('client');
    }

    public function destroy(Agreement $agreement)
    {
        $agreement->delete();
        return response()->json(null, 204);
    }
}
