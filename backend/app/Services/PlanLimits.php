<?php

namespace App\Services;

class PlanLimits
{
    public const PLANS = [
        'starter' => [
            'max_sku' => 30,
            'max_branches' => 1,
            'max_users' => 1,
            'features' => ['pos', 'basic_inventory'],
        ],
        'basic' => [
            'max_sku' => 500,
            'max_branches' => 1,
            'max_users' => 2,
            'features' => ['pos', 'basic_inventory', 'analytics_basic'],
        ],
        'growth' => [
            'max_sku' => null,
            'max_branches' => 2,
            'max_users' => 5,
            'features' => ['pos', 'basic_inventory', 'stock_transfer', 'optimization', 'opname', 'analytics'],
        ],
        'business' => [
            'max_sku' => null,
            'max_branches' => 5,
            'max_users' => 99,
            'features' => ['pos', 'basic_inventory', 'stock_transfer', 'optimization', 'opname', 'analytics', 'omnichannel', 'api_access'],
        ],
    ];

    public static function forPlan(?string $plan): array
    {
        $key = strtolower($plan ?: 'starter');
        return self::PLANS[$key] ?? self::PLANS['starter'];
    }

    public static function planKeys(): string
    {
        return implode(',', array_keys(self::PLANS));
    }

    public static function isUnlimited(mixed $limit): bool
    {
        return $limit === null;
    }
}
