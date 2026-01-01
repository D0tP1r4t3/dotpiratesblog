---
title: "Basic Elastic Beanstalk Enumeration Cheet Sheet"
date: 2025-08-21
categories: ["Cloud", "AWS", "Cheet Sheet"]
tags: ["AWC CLI", "Pacu", "Elastic Beanstalk"]
description: "A cheat sheet for basic Elastic Beanstalk enumeration"
---

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


## **Using Pacu**
```bash
Pacu (low_priv_sess:imported-low_priv_sess) > run elasticbeanstalk__enum --regions us-east-1
```