<?php

namespace App\Http\Controllers;

use App\Models\Agreement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
        $query = Agreement::with(['client', 'quotation.items', 'quotation.client']);

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
        $validated = $this->validateAgreement($request);
        $this->applyAttachmentUpload($request, $validated);

        if (empty($validated['agreement_no'])) {
            $validated['agreement_no'] = self::generateNextNumber();
        }

        $agreement = Agreement::create($validated);

        return $agreement->load(['client', 'quotation.items', 'quotation.client']);
    }

    public function show(Agreement $agreement)
    {
        return $agreement->load(['client', 'quotation.items', 'quotation.client']);
    }

    public function update(Request $request, Agreement $agreement)
    {
        $validated = $this->validateAgreement($request);
        $this->applyAttachmentUpload($request, $validated, $agreement);

        // Explicit removal when client sends remove_attachment=1 without a new file
        if ($request->boolean('remove_attachment') && !$request->hasFile('attachment')) {
            if ($agreement->attachment) {
                Storage::disk('public')->delete($agreement->attachment);
            }
            $validated['attachment'] = null;
            $validated['attachment_name'] = null;
        }

        $agreement->update($validated);

        return $agreement->load(['client', 'quotation.items', 'quotation.client']);
    }

    public function destroy(Agreement $agreement)
    {
        if ($agreement->attachment) {
            Storage::disk('public')->delete($agreement->attachment);
        }
        $agreement->delete();
        return response()->json(null, 204);
    }

    private function validateAgreement(Request $request): array
    {
        // JSON body may send content as array; multipart FormData sends content as JSON string
        if ($request->has('content') && is_string($request->input('content'))) {
            $decoded = json_decode($request->input('content'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $request->merge(['content' => $decoded]);
            }
        }

        return $request->validate([
            'agreement_no' => 'nullable|string',
            'title' => 'required|string',
            'tagline' => 'nullable|string',
            'override_company_name' => 'nullable|string',
            'company_logo' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'quotation_id' => 'nullable|exists:quotations,id',
            'date' => 'required|date',
            'status' => 'required|in:Draft,Sent,Signed,Expired',
            'content' => 'nullable|array',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,webp,txt,zip',
            'remove_attachment' => 'nullable|boolean',
        ]);
    }

    private function applyAttachmentUpload(Request $request, array &$validated, ?Agreement $existing = null): void
    {
        unset($validated['attachment'], $validated['remove_attachment']);

        if (!$request->hasFile('attachment')) {
            return;
        }

        if ($existing?->attachment) {
            Storage::disk('public')->delete($existing->attachment);
        }

        $file = $request->file('attachment');
        $path = $file->store('agreement_attachments', 'public');
        $validated['attachment'] = $path;
        $validated['attachment_name'] = $file->getClientOriginalName();
    }
}
