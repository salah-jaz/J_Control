<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        // Ensure only one admin exists
         if (!User::where('email', 'admin@company.com')->exists()) {
             User::create([
                'name' => 'Admin User',
                'email' => 'admin@company.com',
                'password' => 'admin123', // Will be hashed by model cast
            ]);
        }
    }
}
