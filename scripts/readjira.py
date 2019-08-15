#!/usr/bin/env python3

"""
   Refreshes the data/JIRA/*.json files

   For each .json file found under data/JSON (apart from jira_projects.json) it recreates the file.
   Also refreshes data/JIRA/jira_projects.json
   It does not use the contents of jira_projects.json to refresh the files, because not all of the entries are needed.
   However, once a file has been added to the directory, it will be kept up to date.

   It sleeps(2) between fetches.
   
   This script is run under cron, so does not check the age of any files.
   It is assumed that the job is run as frequently as necessary to keep the files updated
"""

import errtee
import re, os, json, base64, time
try:
    from urllib.request import urlopen, Request
    from urllib.error import HTTPError
    py3 = True
except:
    from urllib2 import urlopen,Request
    from urllib2 import HTTPError
    py3 = False
from os import listdir
from os.path import isfile, join, dirname, abspath
from inspect import getsourcefile

# MYHOME = "/var/www/reporter.apache.org"
# Assume we are one directory below RAO (scripts)
MYHOME = dirname(dirname(abspath(getsourcefile(lambda:0)))) # automatically work out home location so can run the code anywhere
mypath = "%s/data/JIRA" % MYHOME
print("Scanning mypath=%s" % mypath)
myfiles = [ f for f in listdir(mypath) if f.endswith(".json") and isfile(join(mypath,f)) ]

jirapass = ""
with open("/usr/local/etc/tokens/jira.txt", "r") as f:
    jirapass = f.read().strip()
    f.close()

__AUTHSTRING = '%s:%s' % ('githubbot', jirapass)
if py3:
    base64string = base64.b64encode(__AUTHSTRING.encode(encoding='utf-8')).decode(encoding='utf-8')
else:
    base64string = base64.encodestring(__AUTHSTRING)[:-1] # python2 adds a trailing eol

JIRATIMEOUT=90 # This may need to be adjusted
jiraerrors = 0 # count how many errors occurred
def handleError():
    global jiraerrors
    jiraerrors += 1
    if jiraerrors > 5:
        raise Exception("Too many errors - quitting")

def getProjects():
    """Update the list of projects in data/JIRA/jira_projects.json"""
    PROJECT_JSON = "%s/data/JIRA/jira_projects.json" % MYHOME
    x = {}
    jiras = []
    mtime = 0
    print("Refresh %s" % PROJECT_JSON)
    try:
        req = Request("https://issues.apache.org/jira/rest/api/2/project.json")
        req.add_header("Authorization", "Basic %s" % base64string)
        x = json.loads(urlopen(req, timeout=JIRATIMEOUT).read().decode('utf-8'))
        with open(PROJECT_JSON, "w") as f:
            json.dump(x, f, indent=1, sort_keys=True)
            f.close()
            print("Created %s" % PROJECT_JSON)
    except Exception as e:
        print("Err: could not refresh %s: %s" % (PROJECT_JSON, e))
        handleError()

def getJIRAS(project):
    file = "%s/data/JIRA/%s.json" % (MYHOME, project)
    try:
        req = Request("""https://issues.apache.org/jira/rest/api/2/search?jql=project='""" + project + """'+AND+created%3E=-91d&fields=key""") # >=
        req.add_header("Authorization", "Basic %s" % base64string)
        cdata = json.loads(urlopen(req, timeout=JIRATIMEOUT).read().decode('utf-8'))
        req = Request("""https://issues.apache.org/jira/rest/api/2/search?jql=project='""" + project + """'+AND+resolved%3E=-91d&fields=key""") # >=
        req.add_header("Authorization", "Basic %s" % base64string)
        rdata = json.loads(urlopen(req, timeout=JIRATIMEOUT).read().decode('utf-8'))
        with open(file, "w") as f:
            json.dump([cdata['total'], rdata['total'], project], f, indent=1, sort_keys=True)
            f.close()
        return cdata['total'], rdata['total'], project
    except Exception as err:
        response = ''
        if isinstance(err, HTTPError):
            response = err.read().decode('utf-8')
        print("Failed to get data for %s: %s %s" % (project, err, response))
        if "does not exist for the field 'project'" in response:
            print("Removing %s" % file)
            os.remove(file)
        # Don't write an empty file
        handleError()
        return 0,0, None

getProjects()

for project in myfiles:
    jiraname = project.replace(".json", "")
    if jiraname != "jira_projects":
        print("Refreshing JIRA stats for " + jiraname)
        getJIRAS(jiraname)
        time.sleep(2)

print("Done")