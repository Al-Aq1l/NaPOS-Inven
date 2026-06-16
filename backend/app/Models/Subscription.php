<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'plan',
        'billing_cycle',
        'order_id',
        'amount',
        'snap_token',
        'status',
        'payment_type',
        'paid_at',
        'expires_at',
    ];

    protected $casts = [
        'paid_at'    => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
