<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const PERMISSION_DEFINITIONS = [
        [
            'key' => 'view_cost_prices',
            'label' => 'View Cost Prices & Margins',
            'description' => 'See purchase cost prices and profit margins on devices & search',
        ],
        [
            'key' => 'view_personal_accounts',
            'label' => 'View Owner Personal Accounts',
            'description' => 'Access private owner bank accounts (e.g. Equity, Absa) in Treasury',
        ],
        [
            'key' => 'issue_refunds',
            'label' => 'Process Sales Refunds',
            'description' => 'Refund completed receipts and restock returned items',
        ],
        [
            'key' => 'give_discounts',
            'label' => 'Apply POS Discounts',
            'description' => 'Enter discounts during POS checkout',
        ],
        [
            'key' => 'manage_expenses',
            'label' => 'Record & View Expenses',
            'description' => 'Log shop operating expenses and view expense history',
        ],
        [
            'key' => 'view_reports',
            'label' => 'Business Reports & Daily Z-Report',
            'description' => 'Access financial reports, P&L, and Daily Owner Z-Report',
        ],
        [
            'key' => 'manage_inventory',
            'label' => 'Manage Inventory & Stock',
            'description' => 'Add products, receive IMEIs, edit pricing & stock levels',
        ],
        [
            'key' => 'manage_accounts',
            'label' => 'Manage Business Wallets',
            'description' => 'View business accounts, record transfers, deposits & reconciliations',
        ],
    ];

    public const ROLE_DEFAULT_PERMISSIONS = [
        'admin' => [
            'view_cost_prices' => true,
            'view_personal_accounts' => true,
            'issue_refunds' => true,
            'give_discounts' => true,
            'manage_expenses' => true,
            'view_reports' => true,
            'manage_inventory' => true,
            'manage_accounts' => true,
        ],
        'manager' => [
            'view_cost_prices' => true,
            'view_personal_accounts' => false,
            'issue_refunds' => true,
            'give_discounts' => true,
            'manage_expenses' => true,
            'view_reports' => true,
            'manage_inventory' => true,
            'manage_accounts' => true,
        ],
        'cashier' => [
            'view_cost_prices' => false,
            'view_personal_accounts' => false,
            'issue_refunds' => false,
            'give_discounts' => true,
            'manage_expenses' => true,
            'view_reports' => false,
            'manage_inventory' => false,
            'manage_accounts' => false,
        ],
        'technician' => [
            'view_cost_prices' => false,
            'view_personal_accounts' => false,
            'issue_refunds' => false,
            'give_discounts' => false,
            'manage_expenses' => false,
            'view_reports' => false,
            'manage_inventory' => false,
            'manage_accounts' => false,
        ],
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'permissions',
        'commission_type',
        'commission_rate',
        'profile_photo_path',
        'phone',
        'address',
        'emergency_contact_name',
        'emergency_contact_phone',
        'hire_date',
        'status',
        'nin',
        'next_of_kin_name',
        'next_of_kin_phone',
        'two_factor_enabled',
        'two_factor_code',
        'two_factor_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'profile_photo_url',
    ];

    /**
     * Get the URL to the user's profile photo.
     *
     * @return string
     */
    public function getProfilePhotoUrlAttribute()
    {
        if ($this->profile_photo_path) {
            if (str_starts_with($this->profile_photo_path, 'data:image')) {
                return route('images.profile_photo', ['id' => $this->id]);
            }
            if (str_starts_with($this->profile_photo_path, 'http')) {
                return $this->profile_photo_path;
            }
            return asset('storage/' . $this->profile_photo_path);
        }
        
        return $this->defaultProfilePhotoUrl();
    }

    /**
     * Get the default profile photo URL if no profile photo has been uploaded.
     *
     * @return string
     */
    protected function defaultProfilePhotoUrl()
    {
        $name = trim(collect(explode(' ', $this->name))->map(function ($segment) {
            return mb_substr($segment, 0, 1);
        })->join(' '));

        return 'https://ui-avatars.com/api/?name='.urlencode($name).'&color=7F9CF5&background=EBF4FF';
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
            'commission_rate' => 'float',
            'two_factor_enabled' => 'boolean',
            'two_factor_expires_at' => 'datetime',
        ];
    }

    /**
     * Resolve effective boolean permissions for this user (Admin always gets all).
     */
    public function resolvedPermissions(): array
    {
        $role = strtolower($this->role ?? 'cashier');
        if ($role === 'admin') {
            return self::ROLE_DEFAULT_PERMISSIONS['admin'];
        }

        $defaults = self::ROLE_DEFAULT_PERMISSIONS[$role] ?? self::ROLE_DEFAULT_PERMISSIONS['cashier'];
        $overrides = is_array($this->permissions) ? $this->permissions : [];

        $resolved = [];
        foreach ($defaults as $key => $defaultVal) {
            $resolved[$key] = array_key_exists($key, $overrides)
                ? (bool) $overrides[$key]
                : (bool) $defaultVal;
        }
        return $resolved;
    }

    public function hasPermission(string $permission): bool
    {
        $role = strtolower($this->role ?? 'cashier');
        if ($role === 'admin') {
            return true;
        }
        $resolved = $this->resolvedPermissions();
        return (bool) ($resolved[$permission] ?? false);
    }
}
