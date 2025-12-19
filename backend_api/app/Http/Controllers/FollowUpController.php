<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FollowUpController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $query = \App\Models\FollowUp::with('lead');
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('scheduled_at', [$request->start_date, $request->end_date]);
        }
        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'scheduled_at' => 'required|date',
            'notes' => 'nullable|string',
            'status' => 'nullable|string'
        ]);

        $followUp = \App\Models\FollowUp::create($validated);
        return response()->json($followUp, 201);
    }

    public function show($id)
    {
        return \App\Models\FollowUp::with('lead')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $followUp = \App\Models\FollowUp::findOrFail($id);
        $followUp->update($request->all());
        return response()->json($followUp);
    }

    public function destroy($id)
    {
        \App\Models\FollowUp::destroy($id);
        return response()->json(null, 204);
    }
}
