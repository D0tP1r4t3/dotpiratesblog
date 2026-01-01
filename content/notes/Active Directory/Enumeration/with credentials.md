---
date: 2025-08-23
categories: ["Active Directory", "MiTM"]
tags: ["Active Directory", "Assumed Breach"]
description: ""
---

# ** 1. Initial Enumration and Identification **

### a. netexec User Enumration
```bash
sudo netexec smb <dc-ip> -u 'dotpirate' -p 'l3tsh4ck!' --users
```

> Using netexec to enumerate domain users

### b. netexec Group Enumeration
```bash
sudo netexec smb <dc-ip> -u 'dotpirate' -p 'l3tsh4ck!' --groups
```

> Using netexec to enumerate domain groups


### c. netexec Logged on User Enumeration
```bash
sudo netexec smb <dc-ip> -u 'dotpirate' -p 'l3tsh4ck!' --loggedon-users
```

> Check what user are logged on the server at that time

### d. netexec SMB Share Enumeration
```bash
sudo netexec 10.10.10.0/24 smb -u 'dotpirate' -p 'l3tsh4ck!' --shares
```

> Check if our user has access to any shares

### e. Bloodhound (Legacy)
```bash
sudo neo4j

sudo ./Bloodhound

sudo bloodhound-python -u 'dotpirate' -p 'l3tsh4ck!2' -ns <dc-ip> -d dotpirate.local -c all
```

> Spin up neo4j
>
>Download [BloudHound Lgacy](https://github.com/SpecterOps/BloodHound-Legacy/releases) and run it
>
>Download and run BloodHound Ingestor [bloodhound-python](https://github.com/dirkjanm/BloodHound.py)
>
> Analyze the Actice Directory User Permissions and ACL(s)

### f. RPC user enumeration
```bash
rpcclient -U "dotpirate.local/dotpirate" <dc-ip> -c "enumdomusers"
(Enter Password)
```

> Using Credentials through RPC to enumerate users

### g. RPC User Description Enumeration
```bash
rpcclient -U "dotpirate.local/dotpirate" <dc-ip> -c "querydispinfo"
(Enter Password)
```

> Pulling User's description through RPC

### h. Pulling User Description via LDAP and netexec
```bash
sudo netexec ldap <target-ip>  -u 'dotpirate' -p 'l3tsh4ck!' -M get-desc-users
```

> Get description of the users. My contained a password

***


# ** 2. Do I have any access? (Protocol Spray?)**

### a. netexec SMB Access
```bash
sudo netexec smb 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!'

sudo netexec smb 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!' --local-auth
```

> Check if our user can authenitcated into any host on the network via SMB

### b. netexec WINRM Access
```bash
sudo netexec winrm 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!' 
```

> Check if we can access any host in the network through WINRM

### c. evil-winrm WINRM Access
```bash
sudo evil-winrm -i 10.10.10.11 -u 'dotpirate' -p 'l3tsh4ck!' 
```
> Do not rely only on one tool
>
> Use evil-winrm to check if we have acces through WINRM porotocol


### d. netexec RDP Access
```bash
sudo netexec rdp 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!'

sudo netexec rdp 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!' --local-auth
```

> Check if we can access any host in the netrwork through RDP

### f. netexec MSSQL Access
```bash
sudo netexec mssql 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!'

sudo netexec rdp 10.10.10.0/24 -u 'dotpirate' -p 'l3tsh4ck!' --local-auth
```

> Check if we can access any host in the netrwork through MSSQL

### g. impacket MSSQL Access
```bash
sudo impacket-mssqlclient -p 1433 dotpirate.local/dotpirate@<target-ip>

sudo impacket-mssqlclient -p 1433 PC1/dotpirate@<target-ip> -windows-auth
```

> Check if we can access a specific host using a different tool through MSSQL

