# PowerShell script to add .js extensions to all relative imports in TypeScript files

$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Pattern to match: from './something' or from "../something" but NOT already ending in .js
    # Matches both single and double quotes
    $pattern = "from\s+(['""])(\.\./|\./)([^'""]+)(?<!\.js)(['""])"
    
    # Only replace if it doesn't already end with .js
    $newContent = $content -replace $pattern, 'from $1$2$3.js$4'
    
    if ($content -ne $newContent) {
        Write-Host "Fixing: $($file.FullName)"
        Set-Content $file.FullName $newContent -NoNewline
    }
}

Write-Host "Done! All imports have been fixed."
