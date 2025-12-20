<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

Route::post('/login', [AuthController::class, 'login']);

use App\Http\Controllers\LeadController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\InvoiceController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    Route::apiResource('leads', LeadController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('clients', ClientController::class);
    Route::apiResource('invoices', InvoiceController::class);
    Route::apiResource('follow-ups', \App\Http\Controllers\FollowUpController::class);
    Route::apiResource('call-logs', \App\Http\Controllers\CallLogController::class);
    Route::apiResource('incomes', \App\Http\Controllers\IncomeController::class);
    Route::apiResource('expenses', \App\Http\Controllers\ExpenseController::class);
    Route::apiResource('bank-accounts', \App\Http\Controllers\BankAccountController::class);
    Route::apiResource('transactions', \App\Http\Controllers\TransactionController::class);
    Route::apiResource('users', \App\Http\Controllers\UserController::class);
    Route::get('/dashboard-stats', [\App\Http\Controllers\DashboardController::class, 'stats']);

    // Settings Routes
    Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update']);

    // Reports Routes
    Route::get('/reports/summary', [\App\Http\Controllers\ReportsController::class, 'summary']);
    Route::get('/reports/details', [\App\Http\Controllers\ReportsController::class, 'details']);
    Route::get('/reports/filters', [\App\Http\Controllers\ReportsController::class, 'filters']);
});
