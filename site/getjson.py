#!/usr/bin/env python
"""
    CGI script to return data to the Javacript that renders the site (render.js)
    
    It also populates various json files from JIRA if they are stale:
    data/JIRA/jira_projects.json - list of all JIRA projects
    data/JIRA/%.json - for each JIRA project
    
    Usage:
        getjson.py[?only=pmcname|pmcname-to-include][&anon=yes]
    
    Reads the following:
        data/JIRA/jira_projects.json
        data/JIRA/%s.json
        data/health.json
        data/releases/%s.json
        data/pmcs.json
        data/projects.json
        data/mailinglists.json
        data/maildata_extended.json
        https://whimsy.apache.org/public/member-info.json
        https://whimsy.apache.org/public/public_ldap_projects.json
        data/cache/checker.json
        
    
    Environment variables:
    HTTP_X_AUTHENTICATED_USER - set by Apache webserver
    QUERY_STRING - additional group to include
    ONLY - equivalent to ?only CGI param
    ANON - allows for anonymous (redacted) access by normal committers
"""

import os, sys, re, json, subprocess, time
import base64, urllib2, cgi

sys.path.append("../scripts") # module is in sibling directory
import committee_info
from urlutils import UrlCache

# This script may be called frequently, so don't just rely on IfNewer checks
uc = UrlCache(interval=1800, silent=True)

# Relative path to home directory from here (site)
RAOHOME = '../'
RAOHOME_FULL = '/var/www/reporter.apache.org'

COMMITTER_INFO = 'https://whimsy.apache.org/public/public_ldap_people.json'
MEMBER_INFO = 'https://whimsy.apache.org/public/member-info.json'
PROJECTS = 'https://whimsy.apache.org/public/public_ldap_projects.json'
DESCRIPTIONS = 'https://projects.apache.org/json/foundation/committees.json'

# Pick up environment settings
form = cgi.FieldStorage();
oproject = form['only'].value if ('only' in form and len(form['only'].value) > 0) else os.environ['ONLY'] if 'ONLY' in os.environ else None
anon = form.getvalue('anon')

user = os.environ['HTTP_X_AUTHENTICATED_USER'] if 'HTTP_X_AUTHENTICATED_USER' in os.environ else ""
include = os.environ['QUERY_STRING'] if 'QUERY_STRING' in os.environ else None


jmap = {
    'trafficserver': ['TS'],
    'cordova': ['CB'],
    'corinthia': ['COR']
}

pmap = {# convert mailing list name to PMC name
    'community': 'comdev',
    'ws': 'webservices',
    'hc': 'httpcomponents',
    'whimsical': 'whimsy',
    'empire': 'empire-db'
}

ldapmap = {
    'webservices': 'ws'
}

jirapass = ""
with open(RAOHOME+"data/jirapass.txt", "r") as f:
    jirapass = f.read().strip()
    f.close()

def readJson(filename, *default):
    """Read a JSON file. If the read fails, return the default (if any) otherwise return the exception"""
    data = {}
    try:
        with open(filename, "r") as f:
            data = json.load(f)
            f.close()
    except:
        if default == None:
            raise
        else:
            return default[0] # only want first arg
    return data

def loadJson(url):
    resp = uc.get(url, name=None, encoding='utf-8', errors=None)
    j = json.load(resp)
    resp.close()
    return j

projects = loadJson(PROJECTS)['projects']
members = loadJson(MEMBER_INFO)['members']
committers = loadJson(COMMITTER_INFO)['people']
charters = loadJson(DESCRIPTIONS)

def getPMCs(uid):
    """Returns the array of LDAP committee groups to which the uid belongs. Excludes incubator"""
    groups = []
    for group in projects:
        if group != "incubator" and 'pmc' in projects[group]:
            if uid in projects[group]['owners']:
                groups.append(group)
    return groups


def isMember(uid):
    """Determine if the uid is a member of the ASF"""
    return uid in members

def getJIRAProjects(project):
    """Reads data/JIRA/jira_projects.json (re-creating it if it is stale)
       Returns the list of JIRA projects for the project argument
       Assumes that the project names match or the project category matches
       (after trimming "Apache " and spaces and lower-casing)"""
    project = project.replace("Apache ", "").strip().lower()
    refresh = True
    x = {}
    jiras = []
    try:
        mtime = 0
        try:
            st=os.stat(RAOHOME+"data/JIRA/jira_projects.json")
            mtime=st.st_mtime
        except:
            pass
        if mtime >= (time.time() - 86400):
            refresh = False
            x = readJson(RAOHOME+"data/JIRA/jira_projects.json")
        else:
            base64string = base64.encodestring('%s:%s' % ('githubbot', jirapass))[:-1]
    
            try:
                req = urllib2.Request("https://issues.apache.org/jira/rest/api/2/project.json")
                req.add_header("Authorization", "Basic %s" % base64string)
                x = json.loads(urllib2.urlopen(req).read())
                with open(RAOHOME+"data/JIRA/jira_projects.json", "w") as f:
                    json.dump(x, f, indent=1)
                    f.close()
            except:
                pass
    except:
        pass
    
    for entry in x:
        if entry['name'].replace("Apache ", "").strip().lower() == project:
            jiras.append(entry['key'])
        elif 'projectCategory' in entry and fixProjectCategory(entry['projectCategory']['name']) == project:
            jiras.append(entry['key'])
    return jiras

def fixProjectCategory(cat):
    return cat.replace("Apache ", "").replace(" Framework", "").strip().lower()

def getJIRAS(project):
    """Reads data/JIRA/%s.json % (project), re-creating it if it is stale
       from the number of issues created and resolved in the last 91 days
       Returns array of [created, resolved, project]
    """
    refresh = True
    try:
        st=os.stat(RAOHOME+"data/JIRA/%s.json" % project)
        mtime=st.st_mtime
        if mtime >= (time.time() - (2*86400)):
            refresh = False
            x = readJson(RAOHOME+"data/JIRA/%s.json" % project)
            return x[0], x[1], x[2]
    except:
        pass

    if refresh:
        base64string = base64.encodestring('%s:%s' % ('githubbot', jirapass))[:-1]

        try:
            req = urllib2.Request("""https://issues.apache.org/jira/rest/api/2/search?jql=project%20=%20'""" + project + """'%20AND%20created%20%3E=%20-91d""")
            req.add_header("Authorization", "Basic %s" % base64string)
            cdata = json.loads(urllib2.urlopen(req).read())
            req = urllib2.Request("""https://issues.apache.org/jira/rest/api/2/search?jql=project%20=%20'""" + project + """'%20AND%20resolved%20%3E=%20-91d""")
            req.add_header("Authorization", "Basic %s" % base64string)
            rdata = json.loads(urllib2.urlopen(req).read())
            with open(RAOHOME+"data/JIRA/%s.json" % project, "w") as f:
                json.dump([cdata['total'], rdata['total'], project], f, indent=1)
                f.close()
            return cdata['total'], rdata['total'], project
        except Exception as err:
            # Don't create an empty file if the request fails. The likely cause is that the project does not use JIRA,
            # or getjson has been invoked with an invalid pmc name. Invalid files will cause the refresh script to
            # retry the requests unnecessarily. 
            # Furthermore, if there is a temporary issue, creating an empty file will prevent a retry for 48hours.
#             with open(RAOHOME+"data/JIRA/%s.json" % project, "w") as f:
#                 json.dump([0,0,None], f, indent=1)
#                 f.close()
            return 0,0, None
"""
Reads:
 - committee_info.PMCsummary()
 - data/health.json

@return:
 - dict contains pmc name & chair extracted from committee_info.PMCsummary()
 - list of project names
 - health entry from data/health.json
"""

def getProjectData(project):
        x = {}
        y = []
        z = {}
        for xproject in pmcSummary:
            y.append(xproject)
            if xproject == project:
                x['name'] = pmcSummary[project]['name']
                x['chair'] = pmcSummary[project]['chair']
        for entry in dataHealth:
            if entry['group'] == project:
                z = entry
        for xtlp in charters:
            if xtlp.get('id') == project:
                x['charter'] = xtlp.get('charter', '')
        return x, y, z;

def getReleaseData(project):
    """Reads data/releases/%s.json and returns the contents"""
    return readJson(RAOHOME+"data/releases/%s.json" % project, {})


if re.match(r"^[-a-zA-Z0-9_.]+$", user):
    pmcSummary = committee_info.PMCsummary()
    dataHealth = readJson(RAOHOME+"data/health.json", [])
    pchanges = readJson(RAOHOME+"data/pmcs.json")
    cchanges = readJson(RAOHOME+"data/projects.json")
    bugzillastats = readJson(RAOHOME+"data/bugzillastats.json", {})
    isMember = isMember(user)

    groups = getPMCs(user)
    if include and (isMember or anon) and not include in groups and len(include) > 1:
        groups.append(include)
    if oproject and len(oproject) > 0 and (isMember or anon):
        groups = [oproject]
    groups.sort() # so tabs appear in order
    
    # Try cache first?
    wanted_file = "/tmp/%s.json" % "-".join(groups)
    if (os.path.exists(wanted_file) and os.path.getmtime(wanted_file) > (time.time() - 7200)):
        dump = json.load(open(wanted_file, "r"))
        dump['you'] = committers[user]
        if anon:
            dump['mail'] = {}
        dump = json.dumps(dump)
        sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
        sys.stdout.write(dump)
        sys.exit(0)
    
    mlstats = {}
    ml = readJson(RAOHOME+"data/mailinglists.json")
    for entry in ml: # e.g. abdera.apache.org-commits, ws.apache.org-dev
        tlp = entry.split(".")[0]
        if tlp in pmap: # convert ml prefix to PMC internal name
            tlp = pmap[tlp]
        if tlp in groups:
            mlstats[tlp] = mlstats[tlp] if tlp in mlstats else {}
            mlstats[tlp][entry] = ml[entry]
    emails = {}
    mld = readJson(RAOHOME+"data/maildata_extended.json")
    for entry in mld: # e.g. hc-dev, ant-users, ws-dev
        tlp = entry.split("-")[0]
        nentry = entry
        if tlp == "empire":
            tlp = "empire-db"
            nentry = entry.replace("empire-", "empire-db-")
        if tlp in pmap: # convert ml prefix to PMC internal name
            tlp = pmap[tlp]
        if tlp in groups:
            emails[tlp] = emails[tlp] if tlp in emails else {}
            emails[tlp][nentry] = mld[entry]
    pmcdates = readJson(RAOHOME+"data/pmcdates.json")
    dates = {}
    bdata = {} # bugzilla data
    jdata = {}
    cdata = {}
    ddata = {}
    rdata = {}
    allpmcs = []
    keys = {}
    count = {}
    health = {}
    checker_json = None
    # fetch checker_json from checker.apache.org ; use cache as fallback
    try:
        request  = urllib2.Request("https://checker.apache.org/json/", None)
        response = urllib2.urlopen(request, timeout=1)
        content  = response.read()
        checker_json = json.loads(content)
    except:
        checker_json = readJson(RAOHOME+"data/cache/checker.json", None)
    checker = {}
    for group in groups:
        jiras = []
        count[group] = [0,0]
        xgroup = group
        if group in ldapmap:
            xgroup = ldapmap[group]
        if xgroup in pchanges:
            count[group][0] = len(pchanges[xgroup])
        if xgroup in cchanges:
            count[group][1] = len(cchanges[xgroup])
        jdata[group] = [0,0, None]
        ddata[group], allpmcs, health[group] = getProjectData(group)
        rdata[group] = getReleaseData(group)
        if group in bugzillastats:
            bdata[group] = bugzillastats[group]
        else:
            bdata[group] = [0,0,{}]
        # a PMC may have projects using Bugzilla *and* JIRA - e.g. Tomcat - (or neither)
        jiraname = group.upper()
        if group in jmap:
            keys[group] = []
            jdata[group][2] = []
            for jiraname in jmap[group]:
                x,y, p = getJIRAS(jiraname)
                jdata[group][0] += x
                jdata[group][1] += y
                if x > 0 or y > 0:
                    jdata[group][2].append(p)
                keys[group].append(jiraname)
        elif group in ddata and 'name' in ddata[group]:
            jiras = getJIRAProjects(ddata[group]['name'])
            keys[group] = jiras
            jdata[group][2] = []
            for jiraname in jiras:
                x,y, p= getJIRAS(jiraname)
                jdata[group][0] += x
                jdata[group][1] += y
                if x > 0 or y > 0:
                    jdata[group][2].append(p)
        elif jiraname:
            keys[group]=[jiraname]
            x,y, p= getJIRAS(jiraname)
            jdata[group][0] += x
            jdata[group][1] += y
            jdata[group][2] = p

        cdata[group] = cdata[xgroup] if xgroup in cdata else {'pmc': {}, 'committer': {}}
        for pmc in pchanges:
            if pmc == xgroup:
                for member in pchanges[pmc]:
                    if pchanges[pmc][member][1] > 0:
                        cdata[group]['pmc'][member] = pchanges[pmc][member]
        for pmc in cchanges:
            if pmc == xgroup:
                for member in cchanges[pmc]:
                    if cchanges[pmc][member][1] > 0:
                        cdata[group]['committer'][member] = cchanges[pmc][member]
        if group in pmcdates: # Make sure we have this PMC in the JSON, so as to not bork
            dates[group] = pmcdates[group] # only send the groups we want
        if checker_json and 'meta' in checker_json and 'projects' in checker_json:
            meta = checker_json['meta']
            prjs = checker_json['projects']
            checker[group] = prjs[group] if group in prjs else { 'errors': 0 }
            checker[group]['meta'] = meta
    if not isMember:
        allpmcs = []
    if anon:
        mlstats = {}
    
    # Add in kibble data if called with only= ...
    kibble = None
    if oproject:
        try:
            xenv = os.environ.copy()
            del xenv['SCRIPT_NAME']
            txt = subprocess.check_output(('%s/site/wizard/kibble.py' % RAOHOME_FULL, oproject), env = xenv)
            kibble = json.loads(txt)
        except:
            pass
    
    output = {
        'count': count,
        'pmcs': groups,
        'all': sorted(allpmcs),
        'pmcsummary': pmcSummary,
        'mail': mlstats,
        'delivery': emails,
        'jira': jdata,
        'bugzilla': bdata,
        'changes': cdata,
        'pmcdates': dates,
        'pdata': ddata,
        'releases': rdata,
        'keys': keys,
        'health': health,
        'checker': checker,
        'you': committers[user],
        'kibble': kibble,
    }

    # AFAICT dumps always uses \n for EOL
    # Use write rather than print so we don't get any trailing EOL added
    dump = json.dumps(output, indent=1, sort_keys=True).replace('\n', '\r\n')
    sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
    sys.stdout.write(dump)
    
    # Write dump to cache
    with open(wanted_file, "w") as f:
        f.write(dump)
        f.close()
else:
    sys.stdout.write("Content-Type: text/html\r\n\r\n")
    sys.stdout.write("Unknown or invalid user id presented")
