#!/usr/bin/env python
import os, sys, re, json, subprocess, urllib, datetime, time
import base64, urllib2, cgi

form = cgi.FieldStorage();
user = os.environ['HTTP_X_AUTHENTICATED_USER'] if 'HTTP_X_AUTHENTICATED_USER' in os.environ else "nobody"
date = int(form['date'].value) if ('date' in form and len(form['date'].value) > 0) else None
version = form['version'].value.strip() if ('version' in form and len(form['version'].value.strip()) > 0) else None
committee = form['committee'].value if 'committee' in form else None
dojson = form['json'].value if 'json' in form else None
    
def getPMCs(uid):
    groups = []
    ldapdata = subprocess.check_output(['ldapsearch', '-x', '-LLL', '(|(memberUid=%s)(member=uid=%s,ou=people,dc=apache,dc=org))' % (uid, uid), 'cn'])
    picked = {}
    for match in re.finditer(r"dn: cn=([a-zA-Z0-9]+),ou=pmc,ou=committees,ou=groups,dc=apache,dc=org", ldapdata):
        group = match.group(1)
        if group != "incubator":
            groups.append(group)
    return groups


def isMember(uid):
    members = []
    ldapdata = subprocess.check_output(['ldapsearch', '-x', '-LLL', '-b', 'cn=member,ou=groups,dc=apache,dc=org'])
    for match in re.finditer(r"memberUid: ([-a-z0-9_.]+)", ldapdata):
        group = match.group(1)
        members.append(group)
    if uid in members:
        return True
    return False

def getReleaseData(committee):
    try:
        with open("/var/www/reporter.apache.org/data/releases/%s.json" % committee, "r") as f:
            x = json.loads(f.read())
            f.close()
        return x;
    except:
        return {}

saved = False
err = None
if date != None and version and committee:
    if committee in getPMCs(user) or isMember(user):
        rdata = getReleaseData(committee)
        if date >= 86400: # allow for local time just in case
            rdata[version] = date
        else: # it's 1970-01-01
            if version in rdata:
                del rdata[version]
        try:
            with open("/var/www/reporter.apache.org/data/releases/%s.json" % committee, "w") as f:
                json.dump(rdata, f, indent=1, sort_keys=True)
                f.close()
                saved = True
                if dojson:
                    print("Content-Type: application/json\r\n\r\n")
                    print(json.dumps({'versions': rdata}, indent=1))
                else:
                    print("Content-Type: text/html\r\n\r\n<h3>Data submitted!</h3>You may see the updated committee data at: <a href='https://reporter.apache.org/?%s'>https://reporter.apache.org/?%s</a>." % (committee, committee))
        except Exception as e:
            err = e
    else:
        err = "User %s not a member of PMC %s nor an ASF member" % (user, committee)
else:
    err = "Date '%s', version '%s' or committee '%s' is missing" % (date, version, committee)

if not saved:
    if dojson:
        print("Content-Type: application/json\r\n\r\n")
        print(json.dumps({'status': str(err)}))
    else:
        print("Content-Type: text/plain\r\n\r\n")
        print("Could not save. Make sure you have filled out all fields and have access to this committee data! For further inquiries, please contact dev@community.apache.org")
        if not err == None:
            print("Error: %s " % str(err))
