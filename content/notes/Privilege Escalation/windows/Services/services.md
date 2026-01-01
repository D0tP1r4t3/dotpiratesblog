---
title: "Abusing Windows Services"
date: 2025-08-08
categories: ["CTF", "OSCP Prep", "Windows", "PE"]
tags: ["Windows", "Windows Service Abuse", "privilege escalation", "Unquoted Service Path", "Hijacking", "Binary Permissions"]
description: "Techniques with guides on how to exploit Windows Services to elevate privileges"
---


# Services - Unquoted Service Path - Hijacking

## Searching for Running & Stopped Services

When working with Windows services, identifying running and stopped services is crucial for discovering misconfigurations that could lead to privilege escalation.

```powershell
# When using a network logon such as WinRM or a bind shell, Get-CimInstance and Get-Service may result in "permission denied".

# See All Running Services
Get-CimInstance -ClassName win32_service | Select Name,State,PathName | Where-Object {$_.State -like 'Running'}

# Discard Services that start from "C:/Windows" to filter out system services
Get-CimInstance -ClassName win32_service | Select Name,State,PathName | Where-Object {$_.State -like 'Running'} | findstr /i /v "C:\Windows"

# Get Running Services using SC command
sc query | findstr SERVICE_NAME

# Get both STOPPED and RUNNING Services
Get-CimInstance -ClassName win32_service | Select Name,State,PathName
```

## Searching for Unquoted Service Paths

Unquoted service paths are a common misconfiguration where a service executable path contains spaces but lacks quotation marks. This allows an attacker to place a malicious executable in an earlier part of the path, leading to privilege escalation.

```powershell
# Find services with unquoted paths
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """ 
```

## Checking If a Specific Service Starts on Boot

Knowing if a service starts automatically on boot is important for persistence and privilege escalation scenarios.

```powershell
# Check if a service (e.g., Jenkins) starts on boot
Get-CimInstance -ClassName win32_service | Select name, StartMode | Where-Object {$_.Name -like 'jenkins'}

# Retrieve all details about the service
Get-CimInstance -ClassName win32_service | Where-Object {$_.Name -like 'jenkins'}
```

## Checking Service Binary Permissions

Understanding file permissions is critical when assessing whether an attacker can modify a service binary.

|Mask|Permissions|
|---|---|
|F|Full access|
|M|Modify access|
|RX|Read and execute access|
|R|Read-only access|
|W|Write-only access|

**Note**: To modify the binary, we need `F` (Full Access).

```powershell
# Use icacls to check permissions on important directories and service executables
icacls "C:\inetpub"  # Check permissions on IIS web server directory
icacls "C:\xampp\htdocs"  # Check permissions on XAMPP web server directory
icacls "C:\inetpub\wwwroot"  # Check another common web directory

# Check binary permissions for a specific service
icacls "C:\xampp\apache\bin\httpd.exe"
```

## Checking Path Permissions

If an attacker has `Write` or `Full Control` access on a service path, they might replace the service executable with a malicious one.

```powershell
icacls "C:\xampp\apache\"

# We are looking for X (Execute) or F (Full Access)
```

## Checking for Weak Service ACLs

Access Control Lists (ACLs) determine what permissions users and groups have on various system resources.

```powershell
# Check registry permissions for service-related settings
accesschk.exe /accepteula "dotpirate" -kvuqsw hklm\System\CurrentControlSet\services

# Check directory permissions
accesschk.exe /accepteula "dotpi" C:\Tools
```

## Querying a Service for Detailed Information

Using `sc qc` allows you to get details about a service, including its binary path, user account, and other configurations.

```powershell
# Query the configuration of a specific service
sc qc SystemExplorerService64
```

## Automating the Process with PowerUp.ps1

[PowerUp.ps1](https://github.com/PowerShellMafia/PowerSploit/blob/master/Privesc/PowerUp.ps1) is a PowerShell script that automates the process of identifying privilege escalation vulnerabilities related to Windows services.

```powershell
# Bypass execution policy to run PowerUp.ps1
powershell -ep bypass

# Import PowerUp.ps1 script
. .\PowerUp.ps1

# Run all privilege escalation checks
Invoke-AllChecks

# Find services where the binary is modifiable
Get-ModifiableServiceFile
```
