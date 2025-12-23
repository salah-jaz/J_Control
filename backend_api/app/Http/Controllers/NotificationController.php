<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\FollowUp;
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
                'read' => false, // For now, we don't have a read status in DB for notifications, so client handles it or we default to false
                'link' => '/leads', // Or specific lead link
            ];
        });

        return response()->json($notifications);
    }
}
