<?php
function createPwaIcon($size, $filename) {
    $img = imagecreatetruecolor($size, $size);
    
    // Colors
    $bg = imagecolorallocate($img, 15, 23, 42); // #0f172a
    $cyan = imagecolorallocate($img, 6, 182, 212); // #06b6d4
    $white = imagecolorallocate($img, 255, 255, 255);
    $slate = imagecolorallocate($img, 30, 41, 59); // #1e293b
    
    // Fill background
    imagefill($img, 0, 0, $bg);
    
    // Draw rounded background container
    $margin = (int)($size * 0.1);
    $innerSize = $size - ($margin * 2);
    imagefilledrectangle($img, $margin, $margin, $size - $margin, $size - $margin, $slate);
    
    // Draw smartphone outline
    $phoneW = (int)($size * 0.35);
    $phoneH = (int)($size * 0.6);
    $phoneX = (int)(($size - $phoneW) / 2);
    $phoneY = (int)(($size - $phoneH) / 2);
    
    // Outer phone border
    imagesetthickness($img, max(2, (int)($size * 0.03)));
    imagerectangle($img, $phoneX, $phoneY, $phoneX + $phoneW, $phoneY + $phoneH, $cyan);
    
    // Phone notch / camera dot
    $dotRadius = max(2, (int)($size * 0.015));
    imagefilledellipse($img, $size / 2, $phoneY + ($size * 0.05), $dotRadius * 2, $dotRadius * 2, $cyan);
    
    // Phone screen grid / POS receipt symbol
    $screenX = $phoneX + (int)($size * 0.04);
    $screenY = $phoneY + (int)($size * 0.08);
    $screenW = $phoneW - (int)($size * 0.08);
    $screenH = $phoneH - (int)($size * 0.14);
    
    imagefilledrectangle($img, $screenX, $screenY, $screenX + $screenW, $screenY + $screenH, $bg);
    
    // Receipt lines inside phone
    $lineY1 = $screenY + (int)($screenH * 0.25);
    $lineY2 = $screenY + (int)($screenH * 0.5);
    $lineY3 = $screenY + (int)($screenH * 0.75);
    
    imagesetthickness($img, max(1, (int)($size * 0.015)));
    imageline($img, $screenX + (int)($screenW * 0.2), $lineY1, $screenX + (int)($screenW * 0.8), $lineY1, $white);
    imageline($img, $screenX + (int)($screenW * 0.2), $lineY2, $screenX + (int)($screenW * 0.6), $lineY2, $cyan);
    imageline($img, $screenX + (int)($screenW * 0.2), $lineY3, $screenX + (int)($screenW * 0.75), $lineY3, $white);
    
    if (!is_dir(dirname($filename))) {
        mkdir(dirname($filename), 0777, true);
    }
    
    imagepng($img, $filename);
    imagedestroy($img);
    echo "Generated: $filename\n";
}

createPwaIcon(192, __DIR__ . '/../public/icons/icon-192.png');
createPwaIcon(512, __DIR__ . '/../public/icons/icon-512.png');
