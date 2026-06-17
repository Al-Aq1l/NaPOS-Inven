<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\PlanLimits;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index()
    {
        return response()->json(Product::with(['category', 'branches'])->get());
    }

    public function store(Request $request)
    {
        $tenant = auth()->user()->tenant;
        if ($tenant) {
            $limits = PlanLimits::forPlan($tenant->plan);
            $maxSku = $limits['max_sku'];
            $currentSkuCount = Product::count();
            if (! PlanLimits::isUnlimited($maxSku) && $currentSkuCount >= $maxSku) {
                return response()->json([
                    'message' => "Batas SKU paket Anda ({$maxSku} SKU) telah tercapai. Ajukan upgrade paket untuk menambah produk."
                ], 403);
            }
        }

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'cost_price' => 'numeric|min:0',
            'sell_price' => 'numeric|min:0',
            'rop' => 'integer|min:0',
            'lead_time' => 'nullable|integer|min:1',
            'unit' => 'string|max:50',
            'status' => 'in:active,inactive',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }
        unset($validated['image']);

        $product = Product::create($validated);

        if ($request->has('branches')) {
            // branches is an array of [branch_id => ['stock' => 10]]
            $product->branches()->sync($request->branches);
        }

        return response()->json($product->load(['category', 'branches']), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load(['category', 'branches']));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_image' => 'nullable|boolean',
            'cost_price' => 'numeric|min:0',
            'sell_price' => 'numeric|min:0',
            'rop' => 'integer|min:0',
            'lead_time' => 'nullable|integer|min:1',
            'unit' => 'string|max:50',
            'status' => 'in:active,inactive',
        ]);

        if (($validated['remove_image'] ?? false) && $product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $validated['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }
        unset($validated['image'], $validated['remove_image']);

        $product->update($validated);

        if ($request->has('branches')) {
            $product->branches()->sync($request->branches);
        }

        return response()->json($product->load(['category', 'branches']));
    }

    public function destroy(Product $product)
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        $product->delete();
        return response()->json(null, 204);
    }
}
