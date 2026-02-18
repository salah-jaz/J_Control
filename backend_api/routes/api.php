<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

Route::post('/login', [AuthController::class, 'login']);

use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadNoteController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\QuotationController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    Route::apiResource('leads', LeadController::class);
    Route::get('leads/{lead}/notes', [LeadNoteController::class, 'index']);
    Route::post('leads/{lead}/notes', [LeadNoteController::class, 'store']);
    Route::put('notes/{lead_note}', [LeadNoteController::class, 'update']);
    Route::delete('notes/{lead_note}', [LeadNoteController::class, 'destroy']);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('clients', ClientController::class);
    Route::get('invoices/next-number', [InvoiceController::class, 'nextInvoiceNumber']);
    Route::get('invoices/summary', [InvoiceController::class, 'summary']);
    Route::apiResource('invoices', InvoiceController::class);
    Route::get('quotations', [QuotationController::class, 'index']);
    Route::post('quotations', [QuotationController::class, 'store']);
    Route::get('quotations/{quotation}', [QuotationController::class, 'show']);
    Route::put('quotations/{quotation}', [QuotationController::class, 'update']);
    Route::delete('quotations/{quotation}', [QuotationController::class, 'destroy']);
    Route::post('quotations/{quotation}/convert-to-invoice', [QuotationController::class, 'convertToInvoice']);
    Route::apiResource('follow-ups', \App\Http\Controllers\FollowUpController::class);
    Route::apiResource('call-logs', \App\Http\Controllers\CallLogController::class);
    Route::get('incomes/summary', [\App\Http\Controllers\IncomeController::class, 'summary']);
    Route::apiResource('incomes', \App\Http\Controllers\IncomeController::class);
    Route::get('income-categories', [\App\Http\Controllers\IncomeCategoryController::class, 'index']);
    Route::post('income-categories', [\App\Http\Controllers\IncomeCategoryController::class, 'store']);
    Route::delete('income-categories/{id}', [\App\Http\Controllers\IncomeCategoryController::class, 'destroy']);
    Route::get('expenses/summary', [\App\Http\Controllers\ExpenseController::class, 'summary']);
    Route::apiResource('expenses', \App\Http\Controllers\ExpenseController::class);
    Route::get('expense-categories', [\App\Http\Controllers\ExpenseCategoryController::class, 'index']);
    Route::post('expense-categories', [\App\Http\Controllers\ExpenseCategoryController::class, 'store']);
    Route::delete('expense-categories/{id}', [\App\Http\Controllers\ExpenseCategoryController::class, 'destroy']);
    Route::apiResource('bank-accounts', \App\Http\Controllers\BankAccountController::class);
    Route::apiResource('transactions', \App\Http\Controllers\TransactionController::class);
    Route::apiResource('users', \App\Http\Controllers\UserController::class);
    Route::apiResource('products', \App\Http\Controllers\ProductController::class);
    Route::get('/dashboard-stats', [\App\Http\Controllers\DashboardController::class, 'stats']);

    // Settings Routes
    Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\SettingController::class, 'update']);
    Route::post('/settings/upload-logo', [\App\Http\Controllers\SettingController::class, 'uploadLogo']);

    // Reports Routes
    Route::get('/reports/summary', [\App\Http\Controllers\ReportsController::class, 'summary']);
    Route::get('/reports/details', [\App\Http\Controllers\ReportsController::class, 'details']);
    Route::get('/reports/filters', [\App\Http\Controllers\ReportsController::class, 'filters']);
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
});
