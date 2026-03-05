<?php

namespace App\Http\Controllers;

use App\Models\PlannerEvent;
use App\Models\PlannerNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class PlannerEventController extends Controller
{
    /**
     * Transform a PlannerEvent model into a structure suitable for the planner API
     * and FullCalendar (includes both raw fields and computed start/end).
     */
    protected function transformEvent(PlannerEvent $event): array
    {
        $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;

        // start_time / end_time may be Carbon instances or plain strings depending on casting
        $startTime = $event->start_time instanceof \DateTimeInterface
            ? $event->start_time->format('H:i')
            : ($event->start_time ?: null);

        $endTime = $event->end_time instanceof \DateTimeInterface
            ? $event->end_time->format('H:i')
            : ($event->end_time ?: null);

        $start = $eventDate
            ? $eventDate . 'T' . ($startTime ?: '00:00')
            : null;

        $endTimeForRange = $endTime ?: $startTime;
        $end = $eventDate && $endTimeForRange
            ? $eventDate . 'T' . $endTimeForRange
            : ($eventDate ? $eventDate . 'T23:59' : null);

        return [
            'id' => $event->id,
            'title' => $event->title,
            'description' => $event->description,
            'start' => $start,
            'end' => $end,
            'event_date' => $eventDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'category' => $event->category,
            'priority' => $event->priority,
            'status' => $event->status,
            'completed_at' => optional($event->completed_at)->toIso8601String(),
            'rescheduled_from' => $event->rescheduled_from,
            'cancel_reason' => $event->cancel_reason,
            'meeting_notes' => $event->meeting_notes,
            'client_id' => $event->client_id,
            'invoice_id' => $event->invoice_id,
            'reminder_time' => $event->reminder_time,
            'attachment' => $event->attachment,
            'created_by' => $event->created_by,
            'created_at' => optional($event->created_at)->toIso8601String(),
            'updated_at' => optional($event->updated_at)->toIso8601String(),
        ];
    }

    public function index(Request $request)
    {
        $query = PlannerEvent::with(['client', 'invoice']);

        if ($request->filled('start')) {
            $query->whereDate('event_date', '>=', $request->input('start'));
        }

        if ($request->filled('end')) {
            $query->whereDate('event_date', '<=', $request->input('end'));
        }

        if ($request->filled('categories')) {
            $categories = explode(',', $request->input('categories'));
            $query->whereIn('category', $categories);
        }

        if ($request->filled('priorities')) {
            $priorities = explode(',', $request->input('priorities'));
            $query->whereIn('priority', $priorities);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->input('client_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('created_by', $request->input('user_id'));
        }

        $events = $query->orderBy('event_date')->orderBy('start_time')->get();

        // Auto-mark missed events (status = scheduled and end time already passed)
        $now = now();
        foreach ($events as $event) {
            $status = $event->status ?? 'scheduled';
            if ($status !== 'scheduled') {
                continue;
            }

            $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;
            if (!$eventDate) {
                continue;
            }

            $endTime = $event->end_time instanceof \DateTimeInterface
                ? $event->end_time->format('H:i')
                : ($event->end_time ?: ($event->start_time instanceof \DateTimeInterface
                    ? $event->start_time->format('H:i')
                    : ($event->start_time ?: '23:59')));

            $endDateTime = \Carbon\Carbon::parse($eventDate . ' ' . $endTime);

            if ($endDateTime->lt($now)) {
                $event->status = 'missed';
                $event->save();
            }
        }

        $formatted = $events->map(function (PlannerEvent $event) {
            return $this->transformEvent($event);
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted,
        ]);
    }

    /**
     * Get today's planner events (used for reminder checks).
     */
    public function today()
    {
        $today = now()->toDateString();

        $events = PlannerEvent::whereDate('event_date', $today)
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();

        $now = now();
        foreach ($events as $event) {
            $status = $event->status ?? 'scheduled';
            if ($status !== 'scheduled') {
                continue;
            }

            $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;
            if (!$eventDate) {
                continue;
            }

            $endTime = $event->end_time instanceof \DateTimeInterface
                ? $event->end_time->format('H:i')
                : ($event->end_time ?: ($event->start_time instanceof \DateTimeInterface
                    ? $event->start_time->format('H:i')
                    : ($event->start_time ?: '23:59')));

            $endDateTime = \Carbon\Carbon::parse($eventDate . ' ' . $endTime);

            if ($endDateTime->lt($now)) {
                $event->status = 'missed';
                $event->save();
            }
        }

        $formatted = $events->map(function (PlannerEvent $event) {
            return $this->transformEvent($event);
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted,
        ]);
    }

    public function complete(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:planner_events,id',
            'meeting_notes' => 'nullable|string',
            'outcome' => 'nullable|string',
        ]);

        $event = PlannerEvent::findOrFail($validated['event_id']);
        $event->status = 'completed';
        $event->completed_at = now();

        $notes = trim(($validated['meeting_notes'] ?? '') . "\n" . ($validated['outcome'] ?? ''));
        if ($notes !== '') {
            $event->meeting_notes = $notes;
        }

        $event->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Meeting marked as completed',
            'data' => $this->transformEvent($event),
        ]);
    }

    public function reschedule(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:planner_events,id',
            'event_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'reason' => 'nullable|string',
        ]);

        $event = PlannerEvent::findOrFail($validated['event_id']);
        $event->event_date = $validated['event_date'];
        $event->start_time = $validated['start_time'] ?? null;
        $event->end_time = $validated['end_time'] ?? null;
        $event->status = 'rescheduled';

        if (!empty($validated['reason'])) {
            $event->meeting_notes = trim(($event->meeting_notes ?? '') . "\nReschedule reason: " . $validated['reason']);
        }

        if (!$event->rescheduled_from) {
            $event->rescheduled_from = $event->id;
        }

        $event->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Meeting rescheduled',
            'data' => $this->transformEvent($event),
        ]);
    }

    public function nextMeeting(Request $request)
    {
        $validated = $request->validate([
            'source_event_id' => 'required|exists:planner_events,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
            'priority' => 'nullable|string|in:low,medium,high',
            'client_id' => 'nullable|exists:clients,id',
            'reminder_time' => 'nullable|integer|in:10,30,60,1440',
            'meeting_notes' => 'nullable|string',
        ]);

        $source = PlannerEvent::findOrFail($validated['source_event_id']);

        $data = [
            'title' => $validated['title'],
            'description' => $validated['description'] ?? $source->description,
            'event_date' => $validated['event_date'],
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'category' => $validated['category'] ?? $source->category,
            'priority' => $validated['priority'] ?? $source->priority,
            'client_id' => $validated['client_id'] ?? $source->client_id,
            'invoice_id' => $source->invoice_id,
            'reminder_time' => $validated['reminder_time'] ?? $source->reminder_time,
            'status' => 'scheduled',
            'rescheduled_from' => $source->id,
            'meeting_notes' => $validated['meeting_notes'] ?? null,
            'created_by' => Auth::id() ?? $source->created_by,
        ];

        $event = PlannerEvent::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Next meeting scheduled',
            'data' => $this->transformEvent($event),
        ], 201);
    }

    public function cancel(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:planner_events,id',
            'cancel_reason' => 'nullable|string',
        ]);

        $event = PlannerEvent::findOrFail($validated['event_id']);
        $event->status = 'cancelled';
        $event->cancel_reason = $validated['cancel_reason'] ?? null;
        $event->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Meeting cancelled',
            'data' => $this->transformEvent($event),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
            'priority' => 'nullable|string|in:low,medium,high',
            'client_id' => 'nullable|exists:clients,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'reminder_time' => 'nullable|integer|in:10,30,60,1440',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|file|max:5120',
        ]);

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('planner_attachments', 'public');
            $validated['attachment'] = $path;
        }

        $validated['created_by'] = Auth::id();

        $event = PlannerEvent::create($validated);

        if (!empty($validated['notes'])) {
            PlannerNote::create([
                'event_id' => $event->id,
                'title' => $event->title,
                'content' => $validated['notes'],
                'category' => $event->category,
                'priority' => $event->priority,
                'created_by' => Auth::id(),
            ]);
        }

        $event->load(['client', 'invoice']);

        return response()->json([
            'status' => 'success',
            'message' => 'Saved successfully',
            'data' => $this->transformEvent($event),
        ], 201);
    }

    public function show(PlannerEvent $plannerEvent)
    {
        $plannerEvent->load(['client', 'invoice', 'notes']);
        return response()->json($plannerEvent);
    }

    public function update(Request $request, PlannerEvent $plannerEvent)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'event_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
            'priority' => 'nullable|string|in:low,medium,high',
            'client_id' => 'nullable|exists:clients,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'reminder_time' => 'nullable|integer|in:10,30,60,1440',
            'attachment' => 'nullable|file|max:5120',
        ]);

        if ($request->hasFile('attachment')) {
            if ($plannerEvent->attachment) {
                Storage::disk('public')->delete($plannerEvent->attachment);
            }
            $path = $request->file('attachment')->store('planner_attachments', 'public');
            $validated['attachment'] = $path;
        }

        $plannerEvent->update($validated);
        $plannerEvent->load(['client', 'invoice']);

        return response()->json([
            'status' => 'success',
            'message' => 'Updated successfully',
            'data' => $this->transformEvent($plannerEvent),
        ]);
    }

    public function destroy(PlannerEvent $plannerEvent)
    {
        if ($plannerEvent->attachment) {
            Storage::disk('public')->delete($plannerEvent->attachment);
        }

        $plannerEvent->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Event deleted',
        ]);
    }
}

