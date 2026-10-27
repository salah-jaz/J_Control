<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \App\Models\Invoice::observe(\App\Observers\InvoiceObserver::class);
        \App\Models\BankAccount::observe(\App\Observers\BankAccountObserver::class);
        \App\Models\Inv::observe(\App\Observers\InvObserver::class);
        \App\Models\Transaction::observe(\App\Observers\TransactionObserver::class);
    }
}
