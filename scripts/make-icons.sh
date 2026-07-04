#!/bin/bash
# Generate placeholder icons for Tauri
# Requires imagemagick

cd /home/z/my-project/src-tauri/icons

# Create a simple green circle icon
for size in 32 128 256; do
    convert -size ${size}x${size} xc:transparent \
        -fill "#10b981" -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \
        -fill "white" -draw "circle $((size/2)),$((size/2)) $((size/2)),$((size/4))" \
        ${size}x${size}.png
done

# 128x128@2x
convert 128x128.png -resize 256x256 128x128@2x.png

# icon.png (512)
convert 128x128.png -resize 512x512 icon.png

# icon.ico (Windows)
convert 32x32.png 128x128.png 256x256.png icon.ico

echo "Icons created"
ls -la
