!include "FileFunc.nsh"
!include "LogicLib.nsh"

# Embed vcredist - download during install or use pre-cached
# We'll download from Microsoft CDN during install

!macro customInstall
  # Download and install VC++ 2015-2022 Redistributable (x64)
  NSISdl::download "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vcredist_x64.exe"
  ${If} ${FileExists} "$TEMP\vcredist_x64.exe"
    ExecWait '"$TEMP\vcredist_x64.exe" /install /quiet /norestart'
    Delete "$TEMP\vcredist_x64.exe"
  ${EndIf}
!macroend
