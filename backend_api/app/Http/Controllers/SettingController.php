<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

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
}
