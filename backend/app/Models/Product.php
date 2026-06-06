<?php

namespace App\Models;

use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory, TenantScoped;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'sku',
        'barcode',
        'name',
        'description',
        'image_path',
        'cost_price',
        'sell_price',
        'rop',
        'unit',
        'status',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
    ];

    protected $appends = [
        'image_url',
    ];

    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path && str_starts_with($this->image_path, 'http')) {
            return $this->image_path;
        }

        return $this->image_path ? asset('storage/' . $this->image_path) : null;
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function branches()
    {
        return $this->belongsToMany(Branch::class)
            ->withPivot('stock')
            ->withTimestamps();
    }
}
