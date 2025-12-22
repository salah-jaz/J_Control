<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::first();

        if (!$settings) {
            $settings = Setting::create([
                'company' => [
                    'name' => '',
                    'email' => '',
                    'phone' => '',
                    'address' => '',
                    'gst' => '',
                ],
                'finance' => [
                    'currency' => 'INR',
                    'gstEnabled' => 'Yes',
                    'gstPercent' => '18',
                    'fyStart' => 'April',
                ],
                'preferences' => [
                    'theme' => 'Light',
                    'language' => 'English',
                    'dateFormat' => 'DD/MM/YYYY',
                ],
                'security' => [
                    'twoFactor' => 'No',
                    'autoLogout' => '30',
                ],
                'notifications' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true,
                ],
            ]);
        }

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $settings = Setting::first();

        if (!$settings) {
             // Should not happen if index is called first, but good for safety
             $settings = new Setting();
        }

        $settings->fill($request->all());
        $settings->save();

        return response()->json($settings);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $url = asset('storage/' . $path);
            return response()->json(['url' => $url, 'path' => $path]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }
}
