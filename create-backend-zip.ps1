$source = "c:\laragon\www\napos\backend"
$zipPath = "c:\laragon\www\napos\backend-upload.zip"

# Remove old zip if exists
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Load compression assembly
Add-Type -Assembly "System.IO.Compression.FileSystem"

# Create zip
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, "Create")

# Get all files, excluding vendor, node_modules, .env, and COM3
$files = Get-ChildItem $source -Recurse -Force -File | Where-Object {
    $rel = $_.FullName.Substring($source.Length + 1)
    $skip = $false
    if ($rel -like "vendor\*") { $skip = $true }
    if ($rel -like "node_modules\*") { $skip = $true }
    if ($_.Name -eq ".env") { $skip = $true }
    if ($_.Name -eq "COM3") { $skip = $true }
    if ($rel -like "storage\logs\*.log") { $skip = $true }
    -not $skip
}

$count = 0
foreach ($file in $files) {
    $entryName = $file.FullName.Substring($source.Length + 1).Replace("\", "/")
    try {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName) | Out-Null
        $count++
    } catch {
        Write-Host "Skipped: $entryName"
    }
}

$archive.Dispose()
Write-Host "Done! $count files added to backend-upload.zip"
$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "ZIP size: ${size} MB"
