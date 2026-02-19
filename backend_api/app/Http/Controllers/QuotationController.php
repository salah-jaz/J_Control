<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    /**
     * Generate next quotation number: QT-YYYY-NNN
     */
    public static function nextQuotationNo(): string
    {
        $year = date('Y');
        $last = Quotation::where('quotation_no', 'like', "QT-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();
        $seq = $last ? (int) substr($last->quotation_no, -3) + 1 : 1;
        return sprintf('QT-%s-%03d', $year, $seq);
    }

    public function index(Request $request)
    {
        $query = Quotation::with(['client', 'items']);

        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('quotation_no', 'like', "%{$search}%")
                    ->orWhereHas('client', function ($c) use ($search) {
                        $c->where('company_name', 'like', "%{$search}%")
                            ->orWhere('client_name', 'like', "%{$search}%");
                    });
            });
        }

        $quotations = $query->orderBy('created_at', 'desc')->get();

        // Summary counts for list page
        $summary = [
            'total' => Quotation::count(),
            'draft' => Quotation::where('status', 'Draft')->count(),
            'sent' => Quotation::where('status', 'Sent')->count(),
            'accepted' => Quotation::where('status', 'Accepted')->count(),
            'rejected' => Quotation::where('status', 'Rejected')->count(),
            'converted' => Quotation::where('status', 'Converted')->count(),
        ];

        return response()->json([
            'quotations' => $quotations,
            'summary' => $summary,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quotation_no' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'reference_number' => 'nullable|string',
            'sales_person' => 'nullable|string',
            'status' => 'required|in:Draft,Sent,Accepted,Rejected,Converted',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'subtotal' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'total' => 'nullable|numeric',
            'initial_deposit' => 'nullable|numeric',
            'items' => 'nullable|array',
            'items.*.item' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.qty' => 'nullable|numeric',
            'items.*.price' => 'nullable|numeric',
            'items.*.tax' => 'nullable|numeric',
            'items.*.amount' => 'nullable|numeric',
        ]);

        $validated['quotation_no'] = $validated['quotation_no'] ?? self::nextQuotationNo();
        $validated['subtotal'] = $validated['subtotal'] ?? 0;
        $validated['discount'] = $validated['discount'] ?? 0;
        $validated['tax'] = $validated['tax'] ?? 0;
        $validated['total'] = $validated['total'] ?? 0;

        $quotation = Quotation::create($validated);

        $items = $validated['items'] ?? [];
        foreach ($items as $row) {
            $quotation->items()->create([
                'item' => $row['item'],
                'description' => $row['description'] ?? null,
                'qty' => $row['qty'] ?? 1,
                'price' => $row['price'] ?? 0,
                'tax' => $row['tax'] ?? 0,
                'amount' => $row['amount'] ?? 0,
            ]);
        }

        return $quotation->load(['client', 'items']);
    }

    public function show(Quotation $quotation)
    {
        return $quotation->load(['client', 'items']);
    }

    public function update(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'quotation_no' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'date' => 'required|date',
            'expiry_date' => 'nullable|date',
            'reference_number' => 'nullable|string',
            'sales_person' => 'nullable|string',
            'status' => 'required|in:Draft,Sent,Accepted,Rejected,Converted',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'subtotal' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'total' => 'nullable|numeric',
            'initial_deposit' => 'nullable|numeric',
            'items' => 'nullable|array',
            'items.*.id' => 'nullable|exists:quotation_items,id',
            'items.*.item' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.qty' => 'nullable|numeric',
            'items.*.price' => 'nullable|numeric',
            'items.*.tax' => 'nullable|numeric',
            'items.*.amount' => 'nullable|numeric',
        ]);

        $quotation->update($validated);

        $items = $validated['items'] ?? [];
        $quotation->items()->delete();
        foreach ($items as $row) {
            $quotation->items()->create([
                'item' => $row['item'],
                'description' => $row['description'] ?? null,
                'qty' => $row['qty'] ?? 1,
                'price' => $row['price'] ?? 0,
                'tax' => $row['tax'] ?? 0,
                'amount' => $row['amount'] ?? 0,
            ]);
        }

        return $quotation->load(['client', 'items']);
    }

    public function destroy(Quotation $quotation)
    {
        $quotation->delete();
        return response()->json(null, 204);
    }

    /**
     * Convert quotation to invoice. Creates new invoice with same client and items; sets quotation status to Converted.
     */
    public function convertToInvoice(Quotation $quotation)
    {
        if ($quotation->status === 'Converted') {
            return response()->json(['message' => 'Quotation already converted to invoice.'], 422);
        }

        $client = $quotation->client;
        $clientName = $client
            ? ($client->company_name ?: $client->client_name)
            : 'Unknown Client';

        $invoice = Invoice::create([
            'client_id' => $quotation->client_id,
            'client_name' => $clientName,
            'date' => now()->toDateString(),
            'amount' => $quotation->subtotal,
            'status' => 'Pending',
            'gst' => 0,
            'discount' => $quotation->discount,
            'grand_total' => $quotation->total,
            'bank_account_id' => null,
            'gpay_number' => null,
            'qr_code' => null,
        ]);

        foreach ($quotation->items as $item) {
            $invoice->items()->create([
                'service_name' => $item->item . ($item->description ? ' - ' . $item->description : ''),
                'payment_status' => 'Pending',
                'amount' => $item->amount,
            ]);
        }

        $quotation->update(['status' => 'Converted']);

        return response()->json([
            'message' => 'Quotation converted to invoice successfully.',
            'quotation' => $quotation->load(['client', 'items']),
            'invoice' => $invoice->load('items'),
        ]);
    }
}
