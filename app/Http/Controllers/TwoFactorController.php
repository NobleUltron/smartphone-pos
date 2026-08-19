<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\TwoFactorCodeMail;
use App\Models\User;
use Inertia\Inertia;
use Carbon\Carbon;

class TwoFactorController extends Controller
{
    /**
     * Enable or Disable Two-Factor Authentication for the user.
     */
    public function toggle(Request $request)
    {
        $user = $request->user();
        $enable = $request->boolean('enable');

        if ($enable) {
            $code = sprintf('%06d', mt_rand(100000, 999999));
            $user->update([
                'two_factor_enabled' => true,
                'two_factor_code' => $code,
                'two_factor_expires_at' => Carbon::now()->addMinutes(10),
            ]);

            try {
                Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
            } catch (\Exception $e) {
                // Ignore mail sending failure on local test environments if SMTP fails
            }

            return back()->with('success', 'Two-Factor Authentication has been enabled on your account!');
        } else {
            $user->update([
                'two_factor_enabled' => false,
                'two_factor_code' => null,
                'two_factor_expires_at' => null,
            ]);

            return back()->with('success', 'Two-Factor Authentication has been disabled.');
        }
    }

    /**
     * Show the 2FA Challenge page.
     */
    public function showChallenge(Request $request)
    {
        if (!$request->session()->has('2fa_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Verify 2FA challenge during login.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'code' => 'required|numeric|digits:6',
        ]);

        $userId = $request->session()->get('2fa_user_id');
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::find($userId);

        if (!$user || $user->two_factor_code !== $request->code || Carbon::now()->gt($user->two_factor_expires_at)) {
            return back()->withErrors(['code' => 'Invalid or expired 6-digit security code.']);
        }

        // Clear 2FA code & log user in
        $user->update([
            'two_factor_code' => null,
            'two_factor_expires_at' => null,
        ]);

        $remember = $request->session()->get('2fa_remember', false);
        $request->session()->forget(['2fa_user_id', '2fa_remember']);

        Auth::login($user, $remember);
        $request->session()->regenerate();

        \App\Models\ActivityLog::log(
            'user_login_2fa',
            'Security',
            'User logged in via 2FA verification code',
            ['role' => $user->role, 'email' => $user->email]
        );

        $role = $user->role ?? 'cashier';
        if (in_array($role, ['admin', 'manager'])) {
            return redirect()->route('dashboard');
        } elseif ($role === 'technician') {
            return redirect()->route('technician.index');
        }
        return redirect()->route('pos.index');
    }

    /**
     * Resend 2FA verification code via email.
     */
    public function resend(Request $request)
    {
        $userId = $request->session()->get('2fa_user_id') ?: Auth::id();
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::find($userId);
        if ($user) {
            $code = sprintf('%06d', mt_rand(100000, 999999));
            $user->update([
                'two_factor_code' => $code,
                'two_factor_expires_at' => Carbon::now()->addMinutes(10),
            ]);

            try {
                Mail::to($user->email)->send(new TwoFactorCodeMail($code, $user->name));
            } catch (\Exception $e) {
                // Log mail exception if needed
            }
        }

        return back()->with('success', 'A new 6-digit security code has been sent to your email.');
    }
}
