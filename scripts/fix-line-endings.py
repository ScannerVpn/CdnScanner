#!/usr/bin/env python3
"""Convert all .bat and .ps1 files to Windows CRLF line endings."""

import os
import glob

project_root = "/home/z/my-project"

# Find all .bat and .ps1 files
files = []
for ext in ["*.bat", "*.ps1"]:
    files.extend(glob.glob(os.path.join(project_root, ext)))

for filepath in files:
    with open(filepath, "rb") as f:
        content = f.read()
    
    # Convert LF to CRLF (but avoid double-converting)
    # First, convert any CRLF to LF
    content = content.replace(b"\r\n", b"\n")
    # Then convert all LF to CRLF
    content = content.replace(b"\n", b"\r\n")
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    print(f"Converted: {os.path.basename(filepath)}")

print(f"\nDone! Converted {len(files)} files to CRLF.")
