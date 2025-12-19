<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResetAdminPasswordSeeder extends Seeder
{
    public function run()
    {
        $user = User::where('email', 'admin@company.com')->first();
        if ($user) {
            $user->password = Hash::make('admin123');
            $user->save();
            $this->command->info('Password reset for admin@company.com');
        } else {
             User::create([
                'name' => 'Admin User',
                'email' => 'admin@company.com',
                'password' => bcrypt('admin123'),
            ]);
            $this->command->info('User created: admin@company.com');
        }
    }
}
