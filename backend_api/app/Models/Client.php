<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_name',
        'company_name',
        'company_logo',
        'status',
        'company_type',
        'default_currency',
        'financial_year',
        'primary_contact_name',
        'contact_person_name',
        'mobile_number',
        'secondary_mobile_number',
        'email_address',
        'website_url',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'country',
        'pincode',
        'gst_registration_type',
        'gst_state_code',
        'gst_number',
        'pan_number',
        'cin_number',
        'msme_number',
        'tan_number',
        'bank_name',
        'account_holder_name',
        'account_number',
        'ifsc_code',
        'upi_id',
        'cheque_print_name',
        'bank_details',
    ];

    protected $casts = [
        'bank_details' => 'array',
    ];
}
