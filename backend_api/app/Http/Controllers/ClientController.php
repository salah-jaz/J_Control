<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     * Query params: search, status, gstType, location, dateRange, dateFrom, dateTo, locations_only
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        if ($request->boolean('locations_only')) {
            $rows = Client::select('city', 'state')
                ->where(function ($q) {
                    $q->whereNotNull('city')->orWhereNotNull('state');
                })
                ->distinct()
                ->get();
            $locations = $rows->map(function ($row) {
                $parts = array_filter([trim($row->city ?? ''), trim($row->state ?? '')]);
                return implode(', ', $parts);
            })->filter(fn ($v) => $v !== '')->unique()->values()->sort()->values();
            return response()->json($locations);
        }

        $query = Client::query()->latest();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client_name', 'like', $term)
                    ->orWhere('company_name', 'like', $term)
                    ->orWhere('contact_person_name', 'like', $term)
                    ->orWhere('mobile_number', 'like', $term)
                    ->orWhere('secondary_mobile_number', 'like', $term)
                    ->orWhere('email_address', 'like', $term)
                    ->orWhere('gst_number', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = strtolower($request->input('status'));
            if ($status === 'active') {
                $query->where(function ($q) {
                    $q->whereNull('status')->orWhere('status', 'active');
                });
            } elseif ($status === 'inactive') {
                $query->where('status', 'inactive');
            }
        }

        if ($request->filled('gstType') && $request->input('gstType') !== 'all') {
            if (strtolower($request->input('gstType')) === 'gst') {
                $query->whereNotNull('gst_number')->where('gst_number', '!=', '');
            } else {
                $query->where(function ($q) {
                    $q->whereNull('gst_number')->orWhere('gst_number', '');
                });
            }
        }

        if ($request->filled('location')) {
            $location = $request->input('location');
            $parts = array_map('trim', explode(',', $location, 2));
            if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
                $query->where('city', $parts[0])->where('state', $parts[1]);
            } else {
                $query->where(function ($q) use ($location) {
                    $q->where('city', $location)->orWhere('state', $location);
                });
            }
        }

        $dateRange = $request->input('dateRange');
        if ($dateRange && $dateRange !== 'all') {
            $now = now();
            if ($dateRange === 'today') {
                $query->whereDate('created_at', $now->toDateString());
            } elseif ($dateRange === 'week') {
                $query->where('created_at', '>=', $now->copy()->startOfWeek());
            } elseif ($dateRange === 'month') {
                $query->where('created_at', '>=', $now->copy()->startOfMonth());
            } elseif ($dateRange === 'custom' && $request->filled('dateFrom') && $request->filled('dateTo')) {
                $query->whereBetween('created_at', [
                    $request->input('dateFrom') . ' 00:00:00',
                    $request->input('dateTo') . ' 23:59:59',
                ]);
            }
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        return response()->json($query->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        // Normalize empty strings to null for optional fields so nullable|email passes
        $request->merge([
            'email_address' => strlen(trim((string) ($request->input('email_address') ?? ''))) > 0 ? $request->input('email_address') : null,
        ]);

        $validatedData = $request->validate([
            'client_name' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'contact_person_name' => 'nullable|string|max:255',
            'email_address' => 'nullable|email',
        ]);
        if (!strlen(trim((string) ($request->input('client_name') ?? ''))) && !strlen(trim((string) ($request->input('company_name') ?? '')))) {
            return response()->json(['message' => 'Please enter Client Name or Company Name'], 422);
        }

        $payload = $request->all();
        unset($payload['id']);
        // Ensure NOT NULL columns never get null (DB may have company_name as NOT NULL)
        if (array_key_exists('company_name', $payload) && $payload['company_name'] === null) {
            $payload['company_name'] = '';
        }
        $client = Client::create($payload);

        return response()->json($client, 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Client  $client
     * @return \Illuminate\Http\Response
     */
    public function show(Client $client)
    {
        return response()->json($client);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Client  $client
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Client $client)
    {
        $request->merge([
            'email_address' => strlen(trim((string) ($request->input('email_address') ?? ''))) > 0 ? $request->input('email_address') : null,
        ]);

        $validatedData = $request->validate([
            'client_name' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'contact_person_name' => 'nullable|string|max:255',
            'email_address' => 'nullable|email',
        ]);
        if (!strlen(trim((string) ($request->input('client_name') ?? ''))) && !strlen(trim((string) ($request->input('company_name') ?? '')))) {
            return response()->json(['message' => 'Please enter Client Name or Company Name'], 422);
        }

        $payload = $request->except(['id']);
        // DB has company_name as NOT NULL — ensure we never send null on update
        if (array_key_exists('company_name', $payload) && $payload['company_name'] === null) {
            $payload['company_name'] = '';
        }
        $client->update($payload);

        return response()->json($client);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Client  $client
     * @return \Illuminate\Http\Response
     */
    public function destroy(Client $client)
    {
        $client->delete();
        return response()->json(null, 204);
    }
}
