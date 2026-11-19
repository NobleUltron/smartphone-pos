<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    private function authorizeAdmin()
    {
        if (strtolower(auth()->user()->role ?? '') !== 'admin') {
            abort(403, 'Unauthorized action. Only administrators can manage staff accounts.');
        }
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin();

        $query = User::query();

        if ($request->filled('search')) {
            $searchTerm = '%' . strtolower($request->search) . '%';
            $query->where(function($q) use ($searchTerm) {
                $q->whereRaw('LOWER(name) LIKE ?', [$searchTerm])
                  ->orWhereRaw('LOWER(email) LIKE ?', [$searchTerm])
                  ->orWhereRaw('LOWER(role) LIKE ?', [$searchTerm])
                  ->orWhereRaw('LOWER(phone) LIKE ?', [$searchTerm]);
            });
        }

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('name')->paginate(10)->withQueryString();

        $totalStaff = User::count();
        $cashiers = User::where('role', 'cashier')->count();
        $technicians = User::where('role', 'technician')->count();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'status']),
            'summary' => [
                'total_staff' => $totalStaff,
                'cashiers' => $cashiers,
                'technicians' => $technicians,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:admin,manager,cashier,technician',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
            'hire_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'nin' => 'nullable|string|max:255',
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'hire_date' => $validated['hire_date'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'nin' => $validated['nin'] ?? null,
            'next_of_kin_name' => $validated['next_of_kin_name'] ?? null,
            'next_of_kin_phone' => $validated['next_of_kin_phone'] ?? null,
        ]);

        \App\Models\ActivityLog::log(
            'staff_created',
            'Users',
            "Created staff account for {$user->name} ({$user->role})",
            ['staff_id' => $user->id, 'role' => $user->role]
        );

        return response()->json(['success' => true, 'user' => $user]);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$user->id,
            'role' => 'required|in:admin,manager,cashier,technician',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
            'hire_date' => 'nullable|date',
            'status' => 'nullable|in:active,inactive',
            'nin' => 'nullable|string|max:255',
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:255',
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);

        if ((int) $user->id === (int) auth()->id()) {
            if ($validated['role'] !== 'admin') {
                return response()->json(['message' => 'You cannot demote your own administrator role.'], 422);
            }
            if (($validated['status'] ?? 'active') !== 'active') {
                return response()->json(['message' => 'You cannot deactivate your own administrator account.'], 422);
            }
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'hire_date' => $validated['hire_date'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'nin' => $validated['nin'] ?? null,
            'next_of_kin_name' => $validated['next_of_kin_name'] ?? null,
            'next_of_kin_phone' => $validated['next_of_kin_phone'] ?? null,
        ];

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        \App\Models\ActivityLog::log(
            'staff_updated',
            'Users',
            "Updated staff account for {$user->name} (Role: {$user->role}, Status: {$user->status})",
            ['staff_id' => $user->id, 'role' => $user->role, 'status' => $user->status]
        );

        return response()->json(['success' => true, 'user' => $user]);
    }

    public function destroy(User $user)
    {
        $this->authorizeAdmin();
        if ((int) $user->id === (int) auth()->id()) {
            return response()->json(['error' => 'You cannot delete yourself.'], 403);
        }

        $hasHistory = \App\Models\Sale::where('user_id', $user->id)->exists()
            || \App\Models\CashDrawer::where('user_id', $user->id)->exists()
            || \App\Models\Repair::where('user_id', $user->id)->exists()
            || \App\Models\Expense::where('user_id', $user->id)->exists()
            || \App\Models\Invoice::where('user_id', $user->id)->exists()
            || \App\Models\Quotation::where('user_id', $user->id)->exists();

        if ($hasHistory) {
            return response()->json([
                'error' => 'Cannot delete staff member with recorded sales, repairs, expenses, invoices, or cash drawer shifts. Suspend the account instead.'
            ], 422);
        }

        $name = $user->name;
        $id = $user->id;
        $user->delete();

        \App\Models\ActivityLog::log(
            'staff_deleted',
            'Users',
            "Deleted staff account {$name}",
            ['staff_id' => $id]
        );

        return response()->json(['success' => true]);
    }
}
