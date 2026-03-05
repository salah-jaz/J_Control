<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\FollowUp;
use App\Models\PlannerEvent;
use Carbon\Carbon;

class NotificationController extends Controller
{
    public function index()
    {
        // Get pending follow-ups scheduled for today or earlier
        $followUps = FollowUp::with('lead')
            ->where('status', 'pending')
            ->whereDate('scheduled_at', '<=', Carbon::today())
            ->orderBy('scheduled_at', 'asc')
            ->get();

        $notifications = $followUps->map(function ($followUp) {
            return [
                'id' => 'followup-' . $followUp->id,
                'type' => 'Call Reminder',
                'message' => "Call {$followUp->lead->name} ({$followUp->lead->company})",
                'time' => Carbon::parse($followUp->scheduled_at)->diffForHumans(),
                'read' => false,
                'link' => '/leads',
            ];
        })->values()->all();

        // Planner event reminders based on reminder_time (minutes before event start)
        $now = Carbon::now();

        $plannerEvents = PlannerEvent::whereNotNull('reminder_time')
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->whereDate('event_date', '>=', Carbon::today()->subDay())
            ->whereDate('event_date', '<=', Carbon::today()->addDay())
            ->get();

        foreach ($plannerEvents as $event) {
            if (!$event->start_time) {
                continue;
            }

            $eventStart = Carbon::parse($event->event_date . ' ' . $event->start_time);
            $reminderAt = (clone $eventStart)->subMinutes($event->reminder_time ?? 0);

            if ($reminderAt->lte($now) && $eventStart->gte($now)) {
                $notifications[] = [
                    'id' => 'planner-' . $event->id,
                    'type' => 'Planner Reminder',
                    'message' => $event->title . ' at ' . $eventStart->format('h:i A'),
                    'time' => $eventStart->diffForHumans(),
                    'read' => false,
                    'link' => '/planner',
                ];
            }
        }

        return response()->json($notifications);
    }
}
