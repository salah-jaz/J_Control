<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\LeadNote;
use Illuminate\Http\Request;

class LeadNoteController extends Controller
{
    /**
     * GET /leads/{lead}/notes
     */
    public function index(Lead $lead)
    {
        $notes = $lead->leadNotes()->orderBy('created_at', 'desc')->get();
        return response()->json($notes);
    }

    /**
     * POST /leads/{lead}/notes
     */
    public function store(Request $request, Lead $lead)
    {
        $validated = $request->validate([
            'note' => 'required|string',
            'note_type' => 'nullable|string|in:General Note,Call Note,Follow-up Note,Meeting Note,Important',
            'follow_up_date' => 'nullable|date',
            'reminder' => 'nullable|boolean',
        ]);

        $validated['lead_id'] = $lead->id;
        $validated['created_by'] = $request->user()?->name ?? 'Admin';
        $validated['note_type'] = $validated['note_type'] ?? 'General Note';
        $validated['reminder'] = (bool) ($validated['reminder'] ?? false);

        $note = LeadNote::create($validated);
        return response()->json($note, 201);
    }

    /**
     * PUT /notes/{lead_note}
     */
    public function update(Request $request, LeadNote $lead_note)
    {
        $validated = $request->validate([
            'note' => 'sometimes|required|string',
            'note_type' => 'nullable|string|in:General Note,Call Note,Follow-up Note,Meeting Note,Important',
            'follow_up_date' => 'nullable|date',
            'reminder' => 'nullable|boolean',
        ]);

        if (isset($validated['reminder'])) {
            $validated['reminder'] = (bool) $validated['reminder'];
        }

        $lead_note->update($validated);
        return response()->json($lead_note);
    }

    /**
     * DELETE /notes/{lead_note}
     */
    public function destroy(LeadNote $lead_note)
    {
        $lead_note->delete();
        return response()->noContent();
    }
}
