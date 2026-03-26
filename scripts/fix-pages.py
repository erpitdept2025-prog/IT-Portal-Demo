#!/usr/bin/env python3
"""Fix pages by removing duplicate providers that are now at root level."""

import os
import re
from pathlib import Path

app_dir = Path("/vercel/share/v0-project/app")

# List of pages that use SidebarProvider
pages_to_fix = [
    "app/taskflow/progress-logs/page.tsx",
    "app/taskflow/customer-database/page.tsx",
    "app/taskflow/customer-approval/page.tsx",
    "app/taskflow/csr-inquiries/page.tsx",
    "app/taskflow/audit-logs/page.tsx",
    "app/taskflow/activity-logs/page.tsx",
    "app/stash/inventory/page.tsx",
    "app/settings/general/page.tsx",
    "app/cloudflare/dns/page.tsx",
    "app/application/modules/page.tsx",
    "app/acculog/activity-logs/page.tsx",
    "app/account/page.tsx",
    "app/admin/roles-status/page.tsx",
    "app/admin/sessions/page.tsx",
]

for page in pages_to_fix:
    filepath = Path("/vercel/share/v0-project") / page
    
    if not filepath.exists():
        print(f"❌ {page} - NOT FOUND")
        continue
    
    with open(filepath, "r") as f:
        content = f.read()
    
    original = content
    
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
    
    # 6. Remove the opening wrapper pattern: <FormatProvider> <UserProvider> <SidebarProvider>
    content = re.sub(
        r'<FormatProvider>\s*<UserProvider>\s*<SidebarProvider>',
        '<',
        content
    )
    
    # Also handle variations without all three
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
    
    # 7. Fix the opening by making sure content follows directly
    # Handle cases where JSX content was indented
    lines = content.split('\n')
    result_lines = []
    skip_next = False
    
    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue
            
        # Skip empty lines that were between providers
        if re.match(r'^\s*$', line) and i > 0 and i < len(lines) - 1:
            if 'Provider' in lines[i-1] or 'Provider' in lines[i+1]:
                continue
        
        result_lines.append(line)
    
    content = '\n'.join(result_lines)
    
    # 8. Remove closing tags - pattern should be </SidebarProvider> </UserProvider> </FormatProvider>
    content = re.sub(
        r'</SidebarProvider>\s*</UserProvider>\s*</FormatProvider>',
        '',
        content
    )
    
    # Also handle variations
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
        print(f"✅ {page}")
    else:
        print(f"⏭️  {page} - no changes needed")

print("\n✨ Done!")
