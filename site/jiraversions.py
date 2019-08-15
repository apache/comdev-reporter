#!/usr/bin/env python
"""
   Read release info from JIRA if the user is a project member or ASF member
   (Uses LDAP to determine if the user is entitled to update the project)
   Update data/releases/%s.json % project
   TODO: cache the LDAP query responses or use the appropriate json files instead
"""

import os, sys, json, urllib2, time, base64, cgi, calendar

sys.path.append("../scripts") # module is in sibling directory
import ldap_info

form = cgi.FieldStorage()
user = os.environ['HTTP_X_AUTHENTICATED_USER'] if 'HTTP_X_AUTHENTICATED_USER' in os.environ else None
project = form['project'].value if ('project' in form and len(form['project'].value) > 0) else None
jiraname = form['jiraname'].value if ('jiraname' in form and len(form['jiraname'].value) > 0) else None
prepend = form['prepend'].value if ('prepend' in form and len(form['prepend'].value) > 0) else None

"""
Note: to test this script interactively, use a command-line of the form:

HTTP_X_AUTHENTICATED_USER=xyz QUERY_STRING="project=proj&jiraname=xyz[&prepend=pre]" ./jiraversions.py

If a valid JIRA name is used, the project json file will be updated.

"""

# Get the existing release data
def getReleaseData(project):
    try:
        with open("/var/www/reporter.apache.org/data/releases/%s.json" % project, "r") as f:
            return json.loads(f.read())
    except:
        return {}

jirapass = ""
with open("/usr/local/etc/tokens/jira.txt", "r") as f:
    jirapass = f.read().strip()

# Do the cheapest checks first
if jiraname and user and (ldap_info.isMember(user) or project in ldap_info.getPMCownership(user)):
    jiraname = jiraname.upper()
    base64string = base64.encodestring('%s:%s' % ('githubbot', jirapass))[:-1]
    try:
        req = urllib2.Request("https://issues.apache.org/jira/rest/api/2/project/%s/versions" % jiraname)
        req.add_header("Authorization", "Basic %s" % base64string)
        cdata = json.loads(urllib2.urlopen(req).read())
        added = 0
        # Don't read the file until we actually need it (to reduce potential update window)
        rdata = getReleaseData(project)
        for entry in cdata:
            if ('name' in entry and 'releaseDate' in entry and 'released' in entry and entry['released']):
                # force the use of UTC to avoid TZ issues; use float to agree with time.mktime
                date = float(calendar.timegm(time.strptime(entry['releaseDate'], "%Y-%m-%d")))
                ename = entry['name'].strip()
                if prepend:
                    ename = "%s-%s" % (prepend, ename)
                rdata[ename] = date
                added += 1
        # Only update the file if there was an addition:
        if added > 0:
            try:
                with open("/var/www/reporter.apache.org/data/releases/%s.json" % project, "w") as f:
                    json.dump(rdata, f, indent=1, sort_keys=True)
                print("Content-Type: application/json\r\n\r\n")
                print(json.dumps({'status': 'Fetched', 'versions': rdata, 'added': added}, indent=1, sort_keys=True))
            except Exception as e:
                # Use json.dumps to ensure that quotes are handled correctly
                print("Content-Type: application/json\r\n\r\n")
                print(json.dumps({"status": str(e)}))
        else:
            print("Content-Type: application/json\r\n\r\n")
            print(json.dumps({'status': "No releases found in JIRA for '%s'" % jiraname}))
    except urllib2.HTTPError as err:
        print("Content-Type: application/json\r\n\r\n")
        if err.getcode() == 404:
            print(json.dumps({'status': "JIRA project '%s' does not exist" % jiraname}))      
        else:      
            print(json.dumps({"status": str(err)}))
    except Exception as err:
        print("Content-Type: application/json\r\n\r\n")
        print(json.dumps({"status": str(err)}))

else:
    if jiraname and user:
        print("Content-Type: application/json\r\n\r\n")
        print(json.dumps({'status': "user '%s' is not a member of the group '%s' (and is not an ASF member)" % (user, project)}))
    else:
        print("Content-Type: application/json\r\n\r\n")
        print(json.dumps({'status': 'Data missing'}))
