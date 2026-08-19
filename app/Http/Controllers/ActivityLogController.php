<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        if (!in_array(strtolower(auth()->user()->role ?? ''), ['admin', 'manager'])) {
            abort(403, 'Unauthorized action. Audit logs are restricted to Managers and Admins.');
        }

        $query = ActivityLog::with('user:id,name,role,email')
            ->orderBy('created_at', 'desc');

        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate(25)->withQueryString();
        $users = User::select('id', 'name', 'role')->orderBy('name')->get();
        $modules = ActivityLog::distinct()->pluck('module')->filter()->values();

        return Inertia::render('ActivityLogs/Index', [
            'logs' => $logs,
            'users' => $users,
            'modules' => $modules,
            'filters' => $request->only(['module', 'user_id', 'action', 'search'])
        ]);
    }
}
