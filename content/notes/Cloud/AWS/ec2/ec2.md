---
title: "Basic EC2 Enumeration Cheet Sheet"
date: 2025-08-21
categories: ["Cloud", "AWS", "Cheet Sheet"]
tags: ["AWC CLI", "Pacu", "EC2"]
description: "A cheat sheet for basic EC2 enumeration"
---

### **1. List EC2 Instances**

```bash
aws ec2 describe-instances --region [region]
```

> Shows instance IDs, public IPs, AMIs, key names, IAM roles, etc.

Use JMESPath filters for cleaner output:

```bash
aws ec2 describe-instances --query "Reservations[_].Instances[_].[InstanceId,PublicIpAddress,State.Name,KeyName,IamInstanceProfile.Arn]"
```

---
### **2. Get Detailed Info on a Specific Instance**

```bash
aws ec2 describe-instances --instance-ids [i-xxxxxxxxxxxxxxx]
```

---
### **3. Identify IAM Role Attached to the Instance**

```bash
aws ec2 describe-instances --query "Reservations[*].Instances[*].IamInstanceProfile.Arn"
```

Then grab role name and enumerate permissions:

```bash
aws iam get-instance-profile --instance-profile-name [name]
```

---
### **4. List Security Groups**

```bash
aws ec2 describe-security-groups
```

> Look for open ports, especially `0.0.0.0/0` on SSH (22), RDP (3389), or custom ports.

#### a. Check for overly permissive inbound rules:

```bash
aws ec2 describe-security-groups --query "SecurityGroups[_].IpPermissions[_].{From

,To

,CIDR

}"
```

---
### **5. Describe Network Interfaces**

```bash
aws ec2 describe-network-interfaces
```

> See public/private IPs, subnet info, VPC IDs, attachment info.

---
### **6. List AMIs (Amazon Machine Images)**

```bash
aws ec2 describe-images --owners self
```

> Use this to find custom images that may contain secrets or sensitive software.

---
### **7. Check EBS Volume Info**

```bash
aws ec2 describe-volumes
```

> Look for unencrypted volumes, large or attached volumes.

#### a. Snapshot enumeration (potential data leaks):

```bash
aws ec2 describe-snapshots --owner-ids self
```

---
### **8. Enumerate Key Pairs**

```bash
aws ec2 describe-key-pairs
```

> You can't get private keys from AWS, but public names may hint at user naming patterns or poor key hygiene.

---
### **9. Describe Regions & Availability Zones**

```bash
aws ec2 describe-regions aws ec2 describe-availability-zones
```