---
title: "Abusing Schedule Tasks"
date: 2025-08-08
categories: ["CTF", "OSCP Prep", "Windows", "PE"]
tags: ["Windows", "Windows Schedule Task Abuse", "privilege escalation", "Hijacking", "Binary Permissions"]
description: "Techniques with guides on how to exploit Windows Schedule Tasks to elevate privileges"
---


# Enumerating Scheduled Tasks on Windows

## Understanding Scheduled Tasks

Scheduled tasks in Windows allow the execution of scripts, programs, or commands at specific times or events. When enumerating scheduled tasks, it is essential to consider the following:

```mysql
# Prerequisites
- As which user account (principal) does this task get executed?
- What triggers are specified for the task?
- What actions are executed when one or more of these triggers are met?
```

## Commands for Enumerating Scheduled Tasks

### Querying Scheduled Tasks

```cmd
# Basic query of scheduled tasks with detailed information
schtasks /query /fo LIST /v

# Filter scheduled tasks by task name
schtasks /query /fo LIST 2>nul | findstr TaskName

# Export scheduled tasks to a file and filter by specific details
schtasks /query /fo LIST /v > schtasks.txt; cat schtasks.txt | findstr "SYSTEM\|Task To Run" | findstr -B 1 SYSTEM

# Filter scheduled tasks by specific fields of interest
schtasks /query /fo LIST /v | findstr /B /C:"Folder" /C:"TaskName" /C:"Run As User" /C:"Schedule" /C:"Scheduled Task State" /C:"Schedule Type" /C:"Repeat: Every" /C:"Comment"
```

### Using PowerShell

```powershell
# List scheduled tasks excluding Microsoft default tasks
Get-ScheduledTask | where {$_.TaskPath -notlike "\Microsoft*"} | ft TaskName,TaskPath,State
```

## Key Attributes to Analyze

- **Author**: Who created the task?
- **TaskName**: The name of the scheduled task.
- **Task To Run**: The executable or script that the task triggers.
- **Next Run Time**: When the task is scheduled to run next.

## Note

Once you have enumerated scheduled tasks, investigate any anomalies or tasks that execute with high privileges (e.g., SYSTEM).
