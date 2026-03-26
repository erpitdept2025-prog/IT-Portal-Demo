#!/usr/bin/env python3
"""Fix pages by removing duplicate providers that are now at root level."""

import os
import re
from pathlib import Path

# Find all page.tsx files
base_dir = Path.cwd()
app_dir = base_dir / "app"

print(f"Current dir: {base_dir}")
print(f"App dir: {app_dir.exists()}")

# If not found, try going up a level
if not app_dir.exists():
    base_dir = Path("/vercel/share/v0-project")
    app_dir = base_dir / "app"
    print(f"Trying alt path: {app_dir.exists()}")

# Find all page.tsx files recursively
page_files = list(app_dir.glob("**/page.tsx"))

print(f"Found {len(page_files)} page files")

for filepath in page_files:
    page_name = str(filepath.relative_to(base_dir))
    if "Login" in page_name or "Register" in page_name:
        continue  # Skip auth pages
    
    try:
        with open(filepath, "r") as f:
            content = f.read()
        
        original = content
        
        # Skip if doesn't have providers to remove
        if "FormatProvider" not in content and "SidebarProvider" not in content and "UserProvider" not in content:
            continue
        
        # 1. Remove useSearchParams import if present
        content = re.sub(
            r'import\s*\{\s*useRouter,\s*useSearchParams\s*\}\s*from\s*["\']next/navigation["\'];',
            'import { useRouter } from "next/navigation";',
            content
        )
        
        # 2. Remove useSearchParams from standalone import
        content = re.sub(
            r'import\s*\{\s*useSearchParams\s*\}\s*from\s*["\']next/navigation["\'];',
            '',
            content
        )
        
        # 3. Remove SidebarProvider from imports if it's alone
        content = re.sub(
            r'import\s*\{\s*SidebarProvider,\s*SidebarInset,\s*SidebarTrigger,\s*\}\s*from\s*["\']@/components/ui/sidebar["\'];',
            'import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";',
            content
        )
        
        # 4. Remove UserProvider import
        content = re.sub(
            r'import\s*\{\s*UserProvider\s*\}\s*from\s*["\']@/contexts/UserContext["\'];\n?',
            '',
            content
        )
        
        # 5. Remove FormatProvider import
        content = re.sub(
            r'import\s*\{\s*FormatProvider\s*\}\s*from\s*["\']@/contexts/FormatContext["\'];\n?',
            '',
            content
        )
        
        # 6. Remove the opening wrapper patterns
        content = re.sub(
            r'<FormatProvider>\s*<UserProvider>\s*<SidebarProvider>',
            '<',
            content
        )
        
        content = re.sub(
            r'<UserProvider>\s*<SidebarProvider>',
            '<',
            content
        )
        
        content = re.sub(
            r'<FormatProvider>\s*<SidebarProvider>',
            '<',
            content
        )
        
        # 7. Remove closing tags patterns
        content = re.sub(
            r'</SidebarProvider>\s*</UserProvider>\s*</FormatProvider>',
            '',
            content
        )
        
        content = re.sub(
            r'</SidebarProvider>\s*</FormatProvider>',
            '',
            content
        )
        
        content = re.sub(
            r'</SidebarProvider>\s*</UserProvider>',
            '',
            content
        )
        
        if content != original:
            with open(filepath, "w") as f:
                f.write(content)
            print(f"✅ {page_name}")
        else:
            print(f"⏭️  {page_name}")
    
    except Exception as e:
        print(f"❌ {page_name}: {e}")

print("\n✨ Done!")
