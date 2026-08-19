<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = $request->user();

        // Check if user has Two-Factor Authentication enabled
        if ($user->two_factor_enabled) {
            $code = sprintf('%06d', mt_rand(100000, 999999));
            $user->update([
                'two_factor_code' => $code,
                'two_factor_expires_at' => \Carbon\Carbon::now()->addMinutes(10),
            ]);

            try {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\TwoFactorCodeMail($code, $user->name));
            } catch (\Exception $e) {
                // Ignore mail exception on local environment if SMTP unreachable
            }

            // Log out user first, then set 2FA pending user ID in fresh session
            Auth::guard('web')->logout();
            $request->session()->regenerate();

            $request->session()->put('2fa_user_id', $user->id);
            $request->session()->put('2fa_remember', $request->boolean('remember'));

            return redirect()->route('two-factor.challenge');
        }

        $request->session()->regenerate();

        \App\Models\ActivityLog::log(
            'user_login',
            'Security',
            'User logged in successfully',
            ['role' => $user->role, 'email' => $user->email]
        );

        if ($user->role === 'cashier') {
            return redirect(route('pos.index', absolute: false));
        } elseif ($user->role === 'technician') {
            return redirect(route('technician.index', absolute: false));
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        \App\Models\ActivityLog::log(
            'user_logout',
            'Security',
            'User logged out',
            ['email' => $request->user()->email ?? null]
        );

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
