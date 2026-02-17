<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $clients = Client::latest()->get();
        return response()->json($clients);
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
