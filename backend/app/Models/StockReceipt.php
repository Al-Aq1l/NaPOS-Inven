<?php

namespace App\Models;

use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockReceipt extends Model
{
    use HasFactory, TenantScoped;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'user_id',
        'supplier_name',
        'reference_number',
        'notes',
        'total_cost',
    ];

    protected $casts = [
        'total_cost' => 'decimal:2',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(StockReceiptItem::class);
    }
}
