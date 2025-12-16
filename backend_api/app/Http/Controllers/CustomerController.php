<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index()
    {
        return Customer::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'email' => 'required|email',
            'phone' => 'nullable',
            'status' => 'nullable|in:Active,Inactive'
        ]);

        return Customer::create($validated);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
             'name' => 'required',
            'email' => 'required|email',
            'phone' => 'nullable',
            'status' => 'nullable|in:Active,Inactive'
        ]);

        $customer->update($validated);
        return $customer;
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();
        return response()->noContent();
    }
}
