<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Serve the base64 profile photo directly.
     */
    public function servePhoto($id)
    {
        $user = \App\Models\User::findOrFail($id);
        $base64 = $user->profile_photo_path;

        if (!$base64 || !str_starts_with($base64, 'data:image')) {
            abort(404);
        }

        list($type, $data) = explode(';', $base64);
        list(, $data)      = explode(',', $data);
        $type = str_replace('data:', '', $type);
        $decoded = base64_decode($data);

        return response($decoded)
            ->header('Content-Type', $type)
            ->header('Cache-Control', 'public, max-age=86400');
    }

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $binary = file_get_contents($file->getPathname());
            
            // Resize and compress avatar to max 256x256 to ensure lightning-fast database loads
            $img = @imagecreatefromstring($binary);
            if ($img) {
                $width = imagesx($img);
                $height = imagesy($img);
                $newSize = 256;
                $thumb = imagecreatetruecolor($newSize, $newSize);
                imagealphablending($thumb, false);
                imagesavealpha($thumb, true);
                
                $min = min($width, $height);
                $srcX = ($width - $min) / 2;
                $srcY = ($height - $min) / 2;
                imagecopyresampled($thumb, $img, 0, 0, $srcX, $srcY, $newSize, $newSize, $min, $min);
                
                ob_start();
                imagejpeg($thumb, null, 80);
                $compressed = ob_get_clean();
                imagedestroy($img);
                imagedestroy($thumb);
                
                $request->user()->profile_photo_path = 'data:image/jpeg;base64,' . base64_encode($compressed);
            } else {
                $base64 = 'data:' . $file->getMimeType() . ';base64,' . base64_encode($binary);
                $request->user()->profile_photo_path = $base64;
            }
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
