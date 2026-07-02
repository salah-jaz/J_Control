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

        return response()->json($this->ensureAbsoluteUrls($settings));
    }

    /** Ensure company logo, signature, and seal are absolute URLs for print/preview. */
    private function ensureAbsoluteUrls($settings)
    {
        if (!$settings || !isset($settings->company)) {
            return $settings;
        }
        $company = $settings->company;
        if (is_array($company)) {
            foreach (['logo', 'signature', 'seal'] as $key) {
                if (!empty($company[$key]) && !preg_match('#^https?://#i', $company[$key])) {
                    $company[$key] = asset($company[$key]);
                }
            }
            $settings->company = $company;
        }
        return $settings;
    }

    public function update(Request $request)
    {
        $settings = Setting::first();

        if (!$settings) {
             // Should not happen if index is called first, but good for safety
             $settings = new Setting();
        }

        $data = $request->all();
        if (isset($data['company']) && is_array($data['company'])) {
            $company = $data['company'];
            foreach (['logo', 'signature', 'seal'] as $key) {
                if (!empty($company[$key])) {
                    $url = $company[$key];
                    // Strip base URL or schema + host to keep path relative
                    // E.g., http://localhost:8000/storage/logos/filename.png -> storage/logos/filename.png
                    if (preg_match('#^https?://[^/]+/(storage/.*)$#i', $url, $matches)) {
                        $company[$key] = $matches[1];
                    } elseif (preg_match('#^https?://[^/]+/(.*)$#i', $url, $matches)) {
                        $company[$key] = $matches[1];
                    }
                }
            }
            $data['company'] = $company;
        }

        $settings->fill($data);
        $settings->save();

        return response()->json($this->ensureAbsoluteUrls($settings));
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

    public function uploadSignature(Request $request)
    {
        $request->validate([
            'signature' => 'required|image|mimes:png,jpg,jpeg|max:2048',
        ]);

        if ($request->hasFile('signature')) {
            $path = $request->file('signature')->store('signatures', 'public');
            $url = asset('storage/' . $path);
            return response()->json(['url' => $url, 'path' => $path]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }

    public function uploadSeal(Request $request)
    {
        $request->validate([
            'seal' => 'required|image|mimes:png,jpg,jpeg|max:2048',
        ]);

        if ($request->hasFile('seal')) {
            $path = $request->file('seal')->store('seals', 'public');
            $url = asset('storage/' . $path);
            return response()->json(['url' => $url, 'path' => $path]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }
}
