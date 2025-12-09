# Restart DpHost service (requires elevation)
Stop-Process -Name "DpHost*" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Try to restart the service
try {
    Restart-Service -Name DpHost -Force
    Write-Host "DpHost restarted successfully"
} catch {
    Write-Host "Failed to restart via service, trying manual start..."
    # Try to find and start DpHost executable directly
    $dpHostPath = "C:\Program Files\DigitalPersona\DpHost\DpHost.exe"
    if (Test-Path $dpHostPath) {
        & $dpHostPath
        Write-Host "DpHost started from $dpHostPath"
    } else {
        Write-Host "DpHost.exe not found at $dpHostPath"
        # Search in common locations
        $found = Get-ChildItem -Path "C:\Program Files" -Recurse -Filter "DpHost.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            & $found.FullName
            Write-Host "DpHost started from $($found.FullName)"
        }
    }
}

Start-Sleep -Seconds 2
Write-Host "Checking port 52181..."
netstat -ano | findstr ":52181"
