<?php

namespace App\Services;

use Exception;
use Mike42\Escpos\EscposImage;

/**
 * PHP 8.0+ compatible ESC/POS image adapter for GD.
 * 
 * Mike42\Escpos\GdEscposImage uses `is_resource($im)` which fails on PHP 8+
 * because GD now returns `\GdImage` objects instead of resources.
 * 
 * This class fixes that incompatibility and adds:
 *  - Support for file paths and base64 data URIs
 *  - Automatic proportional downscaling to match thermal paper width
 *  - Safe alpha blending (transparent pixels become clean white)
 *  - 1-bit high-contrast monochrome dithering for thermal print heads
 *  - ESC/POS multiple-of-8 pixel width alignment
 */
class SafeGdEscposImage extends EscposImage
{
    public function __construct(string $imageSource, int $maxWidth = 256)
    {
        // Initialize parent with null filename and no optimisations
        parent::__construct(null, false);
        $this->processImage($imageSource, $maxWidth);
    }

    /**
     * Resolve and load an image from path or base64 string into ESC/POS monochrome bitmap
     */
    private function processImage(string $source, int $maxWidth): void
    {
        $gdImg = $this->loadGdImage($source);
        if (!$gdImg) {
            throw new Exception("Unable to decode logo image into GD surface.");
        }

        $origW = imagesx($gdImg);
        $origH = imagesy($gdImg);

        if ($origW <= 0 || $origH <= 0) {
            if ($gdImg instanceof \GdImage) {
                imagedestroy($gdImg);
            }
            throw new Exception("Invalid image dimensions: {$origW}x{$origH}");
        }

        // Calculate proportional dimensions
        $targetW = min($origW, $maxWidth);
        // Round width to nearest lower multiple of 8 for ESC/POS raster alignment
        $targetW = (int)(floor($targetW / 8) * 8);
        if ($targetW < 8) {
            $targetW = 8;
        }
        $targetH = (int) max(1, round(($origH * $targetW) / $origW));

        // Create canvas with clean white background (so alpha transparency turns white, not black)
        $canvas = imagecreatetruecolor($targetW, $targetH);
        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $targetW, $targetH, $white);

        imagealphablending($canvas, true);
        imagecopyresampled($canvas, $gdImg, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);
        imagedestroy($gdImg);

        // Convert into 1-bit binary raster string (1 = black dot, 0 = white/skip)
        $imgData = str_repeat("\0", $targetW * $targetH);
        for ($y = 0; $y < $targetH; $y++) {
            for ($x = 0; $x < $targetW; $x++) {
                $rgb = imagecolorat($canvas, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;

                // ITU-R BT.601 perceptual luminance
                $luminance = (int)(0.299 * $r + 0.587 * $g + 0.114 * $b);

                // High-contrast threshold: pixels darker than 170 become printed black dots
                $imgData[$y * $targetW + $x] = ($luminance < 170) ? 1 : 0;
            }
        }
        imagedestroy($canvas);

        $this->setImgWidth($targetW);
        $this->setImgHeight($targetH);
        $this->setImgData($imgData);
    }

    /**
     * Decode source from base64 data URI or disk file path into GdImage
     */
    private function loadGdImage(string $source): ?\GdImage
    {
        // 1. Check if source is a Base64 data URI
        if (str_starts_with($source, 'data:image')) {
            $parts = explode(',', $source, 2);
            if (count($parts) === 2) {
                $binary = base64_decode($parts[1]);
                if ($binary !== false) {
                    $img = @imagecreatefromstring($binary);
                    if ($img instanceof \GdImage) {
                        return $img;
                    }
                }
            }
        }

        // 2. Resolve disk path
        $filePath = null;
        if (file_exists($source) && is_file($source)) {
            $filePath = $source;
        } else {
            // Check relative to public directory (e.g. /storage/logos/...)
            $cleanRelative = ltrim($source, '/\\');
            $candidatePublic = public_path($cleanRelative);
            if (file_exists($candidatePublic) && is_file($candidatePublic)) {
                $filePath = $candidatePublic;
            } else {
                // Check storage path
                $storageRelative = str_replace(['storage/', 'public/'], '', $cleanRelative);
                $candidateStorage = storage_path('app/public/' . $storageRelative);
                if (file_exists($candidateStorage) && is_file($candidateStorage)) {
                    $filePath = $candidateStorage;
                }
            }
        }

        if (!$filePath) {
            return null;
        }

        $info = @getimagesize($filePath);
        if (!$info) {
            return null;
        }

        $mime = $info['mime'] ?? '';
        return match ($mime) {
            'image/png' => @imagecreatefrompng($filePath) ?: null,
            'image/jpeg' => @imagecreatefromjpeg($filePath) ?: null,
            'image/gif' => @imagecreatefromgif($filePath) ?: null,
            'image/webp' => @imagecreatefromwebp($filePath) ?: null,
            default => @imagecreatefromstring(file_get_contents($filePath)) ?: null,
        };
    }
}
