<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        return response()->json(Product::with(['category', 'branches'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cost_price' => 'numeric|min:0',
            'sell_price' => 'numeric|min:0',
            'rop' => 'integer|min:0',
            'unit' => 'string|max:50',
            'status' => 'in:active,inactive',
        ]);

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
            'cost_price' => 'numeric|min:0',
            'sell_price' => 'numeric|min:0',
            'rop' => 'integer|min:0',
            'unit' => 'string|max:50',
            'status' => 'in:active,inactive',
        ]);

        $product->update($validated);

        if ($request->has('branches')) {
            $product->branches()->sync($request->branches);
        }

        return response()->json($product->load(['category', 'branches']));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }
}
