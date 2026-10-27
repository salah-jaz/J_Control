<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * Display a listing of assets.
     */
    public function index(Request $request)
    {
        $query = Asset::orderBy('id', 'desc');

        if ($request->filled('search')) {
            $term = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('product_name', 'like', $term)
                  ->orWhere('asset_number', 'like', $term);
            });
        }

        if ($request->boolean('paginate')) {
            $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created asset in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_name' => 'nullable|string|max:255',
            'asset_number' => 'nullable|string|max:255',
            'product_count' => 'nullable|numeric|min:0',
            'product_value' => 'nullable|numeric|min:0',
        ]);

        if (array_key_exists('product_name', $validated)) {
            $validated['product_name'] = $validated['product_name'] !== null && trim($validated['product_name']) !== ''
                ? trim($validated['product_name'])
                : null;
        }

        if (array_key_exists('asset_number', $validated)) {
            $validated['asset_number'] = $validated['asset_number'] !== null && trim($validated['asset_number']) !== ''
                ? trim($validated['asset_number'])
                : null;
        }

        if (array_key_exists('product_count', $validated)) {
            $val = $validated['product_count'];
            $validated['product_count'] = ($val !== '' && $val !== null) ? (int) $val : null;
        }

        if (array_key_exists('product_value', $validated)) {
            $val = $validated['product_value'];
            $validated['product_value'] = ($val !== '' && $val !== null) ? (float) $val : null;
        }

        $asset = Asset::create($validated);

        return response()->json($asset, 201);
    }

    /**
     * Display the specified asset.
     */
    public function show($id)
    {
        $asset = Asset::findOrFail($id);
        return response()->json($asset);
    }

    /**
     * Update the specified asset in storage.
     */
    public function update(Request $request, $id)
    {
        $asset = Asset::findOrFail($id);

        $validated = $request->validate([
            'product_name' => 'nullable|string|max:255',
            'asset_number' => 'nullable|string|max:255',
            'product_count' => 'nullable|numeric|min:0',
            'product_value' => 'nullable|numeric|min:0',
        ]);

        if (array_key_exists('product_name', $validated)) {
            $validated['product_name'] = $validated['product_name'] !== null && trim($validated['product_name']) !== ''
                ? trim($validated['product_name'])
                : null;
        }

        if (array_key_exists('asset_number', $validated)) {
            $validated['asset_number'] = $validated['asset_number'] !== null && trim($validated['asset_number']) !== ''
                ? trim($validated['asset_number'])
                : null;
        }

        if (array_key_exists('product_count', $validated)) {
            $val = $validated['product_count'];
            $validated['product_count'] = ($val !== '' && $val !== null) ? (int) $val : null;
        }

        if (array_key_exists('product_value', $validated)) {
            $val = $validated['product_value'];
            $validated['product_value'] = ($val !== '' && $val !== null) ? (float) $val : null;
        }

        $asset->update($validated);

        return response()->json($asset);
    }

    /**
     * Remove the specified asset from storage.
     */
    public function destroy($id)
    {
        $asset = Asset::findOrFail($id);
        $asset->delete();

        return response()->json(['message' => 'Asset deleted successfully'], 200);
    }
}
