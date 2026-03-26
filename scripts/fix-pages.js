#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Pages that still need SidebarProvider removed
const pagesToFix = [
    'app/taskflow/progress-logs/page.tsx',
    'app/taskflow/customer-database/page.tsx',
    'app/taskflow/customer-approval/page.tsx',
    'app/taskflow/csr-inquiries/page.tsx',
    'app/taskflow/audit-logs/page.tsx',
    'app/taskflow/activity-logs/page.tsx',
    'app/stash/inventory/page.tsx',
    'app/cloudflare/dns/page.tsx',
    'app/admin/sessions/page.tsx',
    'app/acculog/activity-logs/page.tsx',
    'app/admin/roles-status/page.tsx',
];

const baseDir = process.cwd();

pagesToFix.forEach(page => {
    const filePath = path.join(baseDir, page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${page} - NOT FOUND`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Remove SidebarProvider from imports
    content = content.replace(
        /import\s*{\s*SidebarProvider,\s*SidebarInset,\s*SidebarTrigger,\s*}\s*from\s*['"]@\/components\/ui\/sidebar['"]/,
        'import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"'
    );

    // Also handle if it's on multiple lines
    content = content.replace(
        /import\s*{\s*SidebarProvider,?\s*SidebarInset,\s*SidebarTrigger,?\s*}\s*from\s*['"]@\/components\/ui\/sidebar['"]/,
        'import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"'
    );

    // Remove useSearchParams from imports if it's with useRouter
    content = content.replace(
        /import\s*{\s*useRouter,\s*useSearchParams\s*}\s*from\s*['"]next\/navigation['"]/,
        'import { useRouter } from "next/navigation"'
    );

    // Remove opening <SidebarProvider> or <FormatProvider> wraps (they're now at root)
    // Handle common patterns
    content = content.replace(/<SidebarProvider>\s*/g, '');
    content = content.replace(/<\/SidebarProvider>\s*/g, '');
    content = content.replace(/<FormatProvider>\s*/g, '');
    content = content.replace(/<\/FormatProvider>\s*/g, '');
    content = content.replace(/<UserProvider>\s*/g, '');
    content = content.replace(/<\/UserProvider>\s*/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${page}`);
    } else {
        console.log(`⏭️  ${page} - no changes`);
    }
});

console.log('\n✨ Done!');
