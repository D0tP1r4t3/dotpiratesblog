---
title: "All in one cheat-sheet for AWS Enumeration"
date: 2025-08-21
categories: ["Cloud", "AWS"]
tags: ["AWC CLI", "Pacu", "S3 Buckets", "IAM", "Lambda", "SNS", "Beanstalk", "EC2"]
description: "This is an all in one cheat-sheet for AWS penetration test. It includes tools, commands and techniques to enumerate an aws environement and potentialy discover paths were we can abuse misconfigurations and escalate privileges"
---


# 🔍 AWS CLI Privilege Escalation & Recon Playbook

---

# **1. Identity – Who am I?**

### Get current identity
```bash
aws sts get-caller-identity --profile <profile>
```

> Returns **Account ID, User ID, and ARN** of your current identity.  
> Confirms if you are a **user**, a **role**, or a **temporary session (STS)**.

### Get account alias
```bash
aws iam list-account-aliases --profile <profile>
```

> Displays the friendly **account alias** (instead of numeric ID).  
> Useful if multiple accounts are in play.


# **2. IAM – Users, Roles, and Policies**

### List IAM users
```bash
aws iam list-users --profile <profile>
```

> Shows all users in the account.  
> Other accounts = potential pivot targets.

### List IAM groups
```bash
aws iam list-groups --profile <profile>
```

> Groups may carry **privileged policies**.

### List IAM roles
```bash
aws iam list-roles --profile <profile>
```

> Roles are valuable targets — if assumable, they can lead to privesc. 

### Show attached managed policies
```bash
aws iam list-attached-user-policies --user-name <username> --profile <profile>
```

> Managed policies are reusable, often broad (e.g., `AdministratorAccess`).

### Show inline policies
```bash
aws iam list-user-policies --user-name <username> --profile <profile>
```

> Inline policies are **custom rules** attached directly to users.

### Dump policy JSON
```bash
aws iam get-policy --policy-arn <arn> --profile <profile>
aws iam get-policy-version --policy-arn <arn> --version-id v1 --profile <profile>
```

> Lets you **read the actual permissions** granted by a policy.


# **3. EC2 & VPC – Instances & Networking**

### List instances
```bash
aws ec2 describe-instances --profile <profile>
```

> Shows running EC2 instances.  
> Look for attached **IAM instance profiles**.

### List subnets
```bash
aws ec2 describe-subnets --profile <profile>
```

> Enumerates network ranges.  
> Helps plan lateral movement.

### List security groups
```bash
aws ec2 describe-security-groups --profile <profile>
```

> Reveals **firewall rules** (open ports, allowed IPs).

### Check instance IAM roles
```bash
aws ec2 describe-iam-instance-profile-associations --profile <profile>
```

> Tells you which **IAM roles are bound to EC2**.  
> Those roles often hold privileged permissions.


# **4. S3 – Object Storage**

### List buckets
```bash
aws s3api list-buckets --profile <profile>
```

> Shows all visible buckets.

### List bucket contents
```bash
aws s3 ls s3://<bucket-name> --profile <profile>
```

> Enumerates files.  
> Try downloading (`aws s3 cp`) if possible.



# **5. DynamoDB – Database Recon**

### List tables
```bash
aws dynamodb list-tables --profile <profile>
```

> Enumerates DynamoDB tables.

### Dump table contents
```bash
aws dynamodb scan --table-name <table> --profile <profile>
```

> Reads all items (if allowed).  
> Can reveal sensitive data or credentials.



# **6. Elastic Beanstalk – Applications & Secrets**

### List Beanstalk applications
```bash
aws elasticbeanstalk describe-applications --profile <profile>
```

> Entry point for hunting **app configs and env vars**.

### List environments for an app
```bash
aws elasticbeanstalk describe-environments --application-name <AppName> --profile <profile>
```

> Each environment is a deployed version of the app.

### Get environment config
```bash
aws elasticbeanstalk describe-configuration-settings --application-name <AppName> --environment-name <EnvName> --profile <profile>
```

> **🔥 High-value target**: often leaks **AWS keys, DB creds, API tokens** in environment variables.



# **7. Lambda – Functions & Roles**

### List Lambda functions
```bash
aws lambda list-functions --profile <profile>
```

> Finds deployed serverless functions.

### Get function configuration
```bash
aws lambda get-function-configuration --function-name <fn> --profile <profile>
```

> Metadata + **environment variables** (secrets often stored here).

### Get function code
```bash
aws lambda get-function --function-name <fn> --profile <profile>
```

> Retrieves actual function code (if allowed).  
> Useful for finding hardcoded credentials.



# **8. Secrets Manager & SSM**

### List secrets
```bash
aws secretsmanager list-secrets --profile <profile>
```

> Enumerates secrets stored in AWS Secrets Manager.

### Get secret value
```bash
aws secretsmanager get-secret-value --secret-id <id> --profile <profile>
```

> Dumps the secret content.

### List SSM parameters
```bash
aws ssm describe-parameters --profile <profile>
```

> Enumerates SSM parameter store.

### Get parameter value
```bash
aws ssm get-parameter --name <param> --with-decryption --profile <profile>
```

> Retrieves parameter content (with decryption if required).



# **9. Misc Recon**

### CloudFormation stacks
```bash
aws cloudformation describe-stacks --profile <profile>
```

> Reveals deployed infra as **IaC templates**.

### ECR repositories
```bash
aws ecr describe-repositories --profile <profile>
```

> Lists Docker image repos.  
> Images may contain secrets.

### RDS instances
```bash
aws rds describe-db-instances --profile <profile>
```

> Lists relational databases (RDS).  
> Can combine with secrets to access DBs.



## **🧭 Workflow Summary**

1. **Identity** → Who am I? (`sts get-caller-identity`)  
2. **IAM** → What perms do I have? (`list-roles`, `list-attached-user-policies`)  
3. **Services** → Enumerate EC2, S3, DynamoDB, etc.  
4. **Secrets** → Look for keys in Beanstalk, Lambda, SSM, Secrets Manager.  
5. **Escalate** → If you get new creds/roles, assume them and restart the loop.  

> ⚡ Tip: Always start with `describe`/`list` → they’re **low-noise, read-only** and tell you what’s possible without modifying anything.