!macro customInstall
  DetailPrint "Checking Docker Desktop..."
  ClearErrors
  SearchPath $0 "docker.exe"
  ${IfNot} ${Errors}
    DetailPrint "Docker CLI already available. Skipping bundled Docker Desktop install."
    Goto dockerBootstrapDone
  ${EndIf}

  IfFileExists "$LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe" dockerAlreadyInstalled 0
  IfFileExists "$LOCALAPPDATA\Programs\Docker\Docker\resources\bin\docker.exe" dockerAlreadyInstalled 0
  IfFileExists "$PROGRAMFILES64\Docker\Docker\resources\bin\docker.exe" dockerAlreadyInstalled 0
  IfFileExists "$PROGRAMFILES\Docker\Docker\resources\bin\docker.exe" dockerAlreadyInstalled 0

  DetailPrint "Docker CLI not found. Installing bundled Docker Desktop during NexxCloud Server setup..."
  IfFileExists "$INSTDIR\resources\docker\Docker Desktop Installer.exe" 0 dockerBundleMissing

  ${IfNot} ${Silent}
    MessageBox MB_ICONINFORMATION|MB_OKCANCEL "NexxCloud Server includes Docker Desktop so Docker Hub apps work on fresh PCs.$\r$\n$\r$\nContinuing will install Docker Desktop in per-user mode during NexxCloud Server setup, accept Docker's subscription service agreement, and start Docker Desktop after setup.$\r$\n$\r$\nDocker Desktop may require WSL 2 and hardware virtualization to be enabled." IDOK dockerInstallConfirmed IDCANCEL dockerBootstrapDone
  ${EndIf}

  dockerInstallConfirmed:
  ExecWait '"$INSTDIR\resources\docker\Docker Desktop Installer.exe" install --user --quiet --accept-license --backend=wsl-2 --no-windows-containers' $1
  ${If} $1 != 0
    MessageBox MB_ICONEXCLAMATION "The bundled Docker Desktop installer exited with code $1.$\r$\n$\r$\nNexxCloud Server was installed, but Docker apps will not run until Docker Desktop is installed and started."
    Goto dockerBootstrapDone
  ${EndIf}

  DetailPrint "Docker Desktop installed."
  Goto startDockerDesktop

  dockerAlreadyInstalled:
    DetailPrint "Docker Desktop is already installed. Starting Docker Desktop..."
    Goto startDockerDesktop

  startDockerDesktop:
    DetailPrint "Starting Docker Desktop..."
    IfFileExists "$LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe" 0 +3
      ExecShell "open" "$LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
      Goto dockerBootstrapDone
    IfFileExists "$LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe" 0 +3
      ExecShell "open" "$LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
      Goto dockerBootstrapDone
    IfFileExists "$PROGRAMFILES64\Docker\Docker\Docker Desktop.exe" 0 +3
      ExecShell "open" "$PROGRAMFILES64\Docker\Docker\Docker Desktop.exe"
      Goto dockerBootstrapDone
    IfFileExists "$PROGRAMFILES\Docker\Docker\Docker Desktop.exe" 0 dockerBootstrapDone
      ExecShell "open" "$PROGRAMFILES\Docker\Docker\Docker Desktop.exe"
      Goto dockerBootstrapDone

  dockerBundleMissing:
    MessageBox MB_ICONEXCLAMATION "The NexxCloud Server installer did not contain the Docker Desktop bundle.$\r$\n$\r$\nBuild the server installer again so Docker Desktop is embedded."
    Goto dockerBootstrapDone

  dockerBootstrapDone:
!macroend
