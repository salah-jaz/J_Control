<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $invoices = \App\Models\Invoice::all();
        foreach ($invoices as $invoice) {
            $amount = $invoice->amount;
            $gst = $invoice->gst ?? 0;
            $discount = $invoice->discount ?? 0;
            $grand_total = max(0, $amount + ($amount * ($gst / 100)) - $discount);
            
            // Use DB::table to avoid model events or just for speed/directness if model has changed
            DB::table('invoices')
                ->where('id', $invoice->id)
                ->update(['grand_total' => $grand_total]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // No reverse needed really, or set to 0
    }
};
