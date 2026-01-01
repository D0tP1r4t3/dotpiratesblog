---
title: "Transfering files using SSH Protocol with scp"
date: 2025-08-12
categories: ["CTF", "Techinques", "Transfering Files"]
tags: ["exfiltration", "SSH"]
description: "The following commands serve as a refernce on how to upload or download files and directories using the SSH protocol"
---

Utilizing scp to upload and download files and directories from or on the target system.

# Uploading Files/Directories

## Upload a File
```bash
scp upc.sh victim@192.168.179.214:/home/victim
```

## Upload a Directory
```bash
scp -r unix-privesc-check victim@192.168.179.214:/home/victim
```

---

# Downloading Files/Directories

## Download a File
```bash
scp victim@192.168.179.214:/home/victim/upc.sh upc.sh 
```

## Download a Directory
```bash
scp -r victim@192.168.179.214:/home/victim/unix-privesc-check unix-privesc-check 
```