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
            'status' => $event->status,
            'completed_at' => optional($event->completed_at)->toIso8601String(),
            'rescheduled_from' => $event->rescheduled_from,
            'cancel_reason' => $event->cancel_reason,
            'meeting_notes' => $event->meeting_notes,
            'client_id' => $event->client_id,
            'client_name' => optional($event->client)->company_name
                ?? optional($event->client)->client_name
                ?? optional($event->client)->name,
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

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->input('client_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('created_by', $request->input('user_id'));
        }

        $events = $query->orderBy('event_date')->orderBy('start_time')->get();

        // Auto-mark overdue: current time > event start time AND status not completed/cancelled
        $now = now();
        foreach ($events as $event) {
            $status = $event->status ?? 'scheduled';
            if (in_array($status, ['completed', 'cancelled'], true)) {
                continue;
            }

            $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;
            if (!$eventDate) {
                continue;
            }

            $startTime = $event->start_time instanceof \DateTimeInterface
                ? $event->start_time->format('H:i')
                : ($event->start_time ?: '00:00');
            $startDateTime = \Carbon\Carbon::parse($eventDate . ' ' . $startTime);

            if ($startDateTime->lt($now)) {
                $event->status = 'overdue';
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
     * Get high-level statistics for planner events.
     * Sync overdue status once (do not overwrite completed/cancelled) so counts are accurate.
     */
    public function stats()
    {
        $today = now()->toDateString();

        // One-time sync: mark as overdue where start time has passed and not completed/cancelled
        $now = now();
        $overdueIds = PlannerEvent::whereNotIn('status', ['completed', 'cancelled'])
            ->get()
            ->filter(function ($event) use ($now) {
                $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;
                if (!$eventDate) {
                    return false;
                }
                $startTime = $event->start_time instanceof \DateTimeInterface
                    ? $event->start_time->format('H:i')
                    : ($event->start_time ?: '00:00');
                $startDateTime = \Carbon\Carbon::parse($eventDate . ' ' . $startTime);
                return $startDateTime->lt($now);
            })
            ->pluck('id')
            ->all();
        if (!empty($overdueIds)) {
            PlannerEvent::whereIn('id', $overdueIds)->update(['status' => 'overdue']);
        }

        $totalEvents = PlannerEvent::count();
        $todayEvents = PlannerEvent::whereDate('event_date', $today)->count();
        $completedEvents = PlannerEvent::where('status', 'completed')->count();
        $upcomingEvents = PlannerEvent::where('status', 'scheduled')
            ->whereDate('event_date', '>=', $today)
            ->count();
        $cancelledEvents = PlannerEvent::where('status', 'cancelled')->count();
        $overdueEvents = PlannerEvent::where('status', 'overdue')->count();

        return response()->json([
            'total_events' => $totalEvents,
            'today_events' => $todayEvents,
            'completed_events' => $completedEvents,
            'upcoming_events' => $upcomingEvents,
            'cancelled_events' => $cancelledEvents,
            'overdue_events' => $overdueEvents,
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
            if (in_array($status, ['completed', 'cancelled'], true)) {
                continue;
            }

            $eventDate = $event->event_date ? $event->event_date->format('Y-m-d') : null;
            if (!$eventDate) {
                continue;
            }

            $startTime = $event->start_time instanceof \DateTimeInterface
                ? $event->start_time->format('H:i')
                : ($event->start_time ?: '00:00');
            $startDateTime = \Carbon\Carbon::parse($eventDate . ' ' . $startTime);

            if ($startDateTime->lt($now)) {
                $event->status = 'overdue';
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

    public function complete(Request $request, $id)
    {
        try {
            if ($id === null || $id === '' || (string) $id === 'undefined') {
                return response()->json(['status' => 'error', 'message' => 'Invalid event ID.'], 400);
            }
            $event = PlannerEvent::find($id);
            if (!$event) {
                return response()->json(['status' => 'error', 'message' => 'Event not found.'], 404);
            }
            $validated = $request->validate([
                'meeting_notes' => 'nullable|string',
                'outcome' => 'nullable|string',
            ]);
            $event->status = 'completed';
            $event->completed_at = now();

            $notes = trim(($validated['meeting_notes'] ?? '') . "\n" . ($validated['outcome'] ?? ''));
            if ($notes !== '') {
                $event->meeting_notes = $notes;
            }

            $event->save();
            $event->load(['client', 'invoice']);

            $payload = $this->transformEvent($event);

            return response()->json([
                'status' => 'success',
                'message' => 'Meeting marked as completed',
                'data' => $payload,
                'event' => $payload,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function reschedule(Request $request, $id)
    {
        try {
            if ($id === null || $id === '' || (string) $id === 'undefined') {
                return response()->json(['status' => 'error', 'message' => 'Invalid event ID.'], 400);
            }
            $event = PlannerEvent::find($id);
            if (!$event) {
                return response()->json(['status' => 'error', 'message' => 'Event not found.'], 404);
            }
            $validated = $request->validate([
                'event_date' => 'required|date',
                'start_time' => 'required',
                'end_time' => 'nullable',
                'reason' => 'nullable|string',
            ]);
            $event->event_date = $validated['event_date'];
            $event->start_time = $validated['start_time'];
            $event->end_time = $validated['end_time'] ?? null;
            $event->status = 'rescheduled';

            if (!empty($validated['reason'])) {
                $event->meeting_notes = trim(($event->meeting_notes ?? '') . "\nReschedule reason: " . $validated['reason']);
            }

            if (!$event->rescheduled_from) {
                $event->rescheduled_from = $event->id;
            }

            $event->save();
            $event->load(['client', 'invoice']);

            $payload = $this->transformEvent($event);

            return response()->json([
                'status' => 'success',
                'message' => 'Meeting rescheduled',
                'data' => $payload,
                'event' => $payload,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function nextMeeting(Request $request, $id)
    {
        try {
            if ($id === null || $id === '' || (string) $id === 'undefined') {
                return response()->json(['status' => 'error', 'message' => 'Invalid event ID.'], 400);
            }
            $source = PlannerEvent::find($id);
            if (!$source) {
                return response()->json(['status' => 'error', 'message' => 'Event not found.'], 404);
            }
            $validated = $request->validate([
                'title' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'event_date' => 'required|date',
                'start_time' => 'required',
                'end_time' => 'nullable',
                'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
                'client_id' => 'nullable|exists:clients,id',
                'reminder_time' => 'nullable|integer|in:10,30,60,1440',
                'notes' => 'nullable|string',
                'meeting_notes' => 'nullable|string',
            ]);

            $notes = $validated['meeting_notes'] ?? $validated['notes'] ?? null;

            $data = [
                'title' => $validated['title'] ?? $source->title,
                'description' => $validated['description'] ?? $source->description,
                'event_date' => $validated['event_date'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'] ?? null,
                'category' => $validated['category'] ?? $source->category,
                'client_id' => $validated['client_id'] ?? $source->client_id,
                'invoice_id' => $source->invoice_id,
                'reminder_time' => $validated['reminder_time'] ?? $source->reminder_time,
                'status' => 'scheduled',
                'rescheduled_from' => $source->id,
                'meeting_notes' => $notes,
                'created_by' => $source->created_by ?? Auth::id(),
            ];

            $event = PlannerEvent::create($data);
            $event->load(['client', 'invoice']);

            $payload = $this->transformEvent($event);

            return response()->json([
                'status' => 'success',
                'message' => 'Next meeting scheduled',
                'data' => $payload,
                'event' => $payload,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function cancel(Request $request, $id)
    {
        try {
            if ($id === null || $id === '' || (string) $id === 'undefined') {
                return response()->json(['status' => 'error', 'message' => 'Invalid event ID.'], 400);
            }
            $event = PlannerEvent::find($id);
            if (!$event) {
                return response()->json(['status' => 'error', 'message' => 'Event not found.'], 404);
            }
            $validated = $request->validate([
                'cancel_reason' => 'nullable|string',
                'reason' => 'nullable|string',
            ]);
            $event->status = 'cancelled';
            $event->cancel_reason = $validated['cancel_reason'] ?? $validated['reason'] ?? null;
            $event->save();
            $event->load(['client', 'invoice']);

            $payload = $this->transformEvent($event);

            return response()->json([
                'status' => 'success',
                'message' => 'Meeting cancelled',
                'data' => $payload,
                'event' => $payload,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
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
                'priority' => 'medium',
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

