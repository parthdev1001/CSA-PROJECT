param(
    [string]$Compiler = 'gcc',
    [switch]$Test
)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force -Path 'build' | Out-Null
    $prefix = @()
    if ([System.IO.Path]::GetFileNameWithoutExtension($Compiler) -eq 'zig') {
        $prefix = @('cc')
    }
    $flags = @('-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-O2', '-Iinclude')
    & $Compiler @prefix @flags src\assembler.c src\simulator.c src\main.c -o build\assembler.exe
    if ($LASTEXITCODE -ne 0) { throw 'Assembler compilation failed.' }
    Write-Output 'Built build\assembler.exe'
    if ($Test) {
        & $Compiler @prefix @flags src\assembler.c src\simulator.c tests\test_assembler.c -o build\test_assembler.exe
        if ($LASTEXITCODE -ne 0) { throw 'Test compilation failed.' }
        & '.\build\test_assembler.exe'
        if ($LASTEXITCODE -ne 0) { throw 'Assembler unit tests failed.' }
    }
} finally {
    Pop-Location
}
