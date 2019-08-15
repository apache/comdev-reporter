#!/usr/bin/env python
"""
    WSGI script to return data to the reporter.a.o wizard
    
    It also populates various json files from JIRA if they are stale:
    data/JIRA/jira_projects.json - list of all JIRA projects
    data/JIRA/%.json - for each JIRA project
        
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
    
"""

import os, sys, re, json, subprocess, time
import base64, requests
import rapp.kibble

CACHE_TIMEOUT = 14400

import committee_info
from urlutils import UrlCache

# This script may be called frequently, so don't just rely on IfNewer checks
uc = UrlCache(cachedir='../data/cache', interval=CACHE_TIMEOUT, silent=True)

# Relative path to home directory from here (site)
RAOHOME_FULL = '/var/www/reporter.apache.org/'
RAOHOME = RAOHOME_FULL

COMMITTER_INFO = 'https://whimsy.apache.org/public/public_ldap_people.json'
MEMBER_INFO = 'https://whimsy.apache.org/public/member-info.json'
PROJECTS = 'https://whimsy.apache.org/public/public_ldap_projects.json'
DESCRIPTIONS = 'https://projects.apache.org/json/foundation/committees.json'

def has_cache(filename, ttl = 14400):
    return (os.path.exists(filename) and os.path.getmtime(filename) > (time.time() - ttl))

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
with open("/usr/local/etc/tokens/jira.txt", "r") as f:
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
    groups = [pmap.get(x, x) for x in groups]
    return groups


def isASFMember(uid):
    """Determine if the uid is a member of the ASF"""
    return uid in members

def getJIRAProjects(project, tlpid):
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
            if sys.version_info >= (3, 0):
                base64string = base64.encodestring(('%s:%s' % ('githubbot', jirapass)).encode('ascii')).decode('ascii')[:-1]
            else:
                base64string = base64.encodestring('%s:%s' % ('githubbot', jirapass))[:-1]
    
            try:
                x = requests.get("https://issues.apache.org/jira/rest/api/2/project.json", headers = {"Authorization": "Basic %s" % base64string}).json()
                with open(RAOHOME+"data/JIRA/jira_projects.json", "w") as f:
                    json.dump(x, f, indent=1)
                    f.close()
            except:
                pass
    except:
        pass
    
    for entry in x:
        # Check if this is actually a TLP not ours
        mayuse = True
        for xtlp in charters:
            if fixProjectCategory(xtlp['name']) == fixProjectCategory(entry['name']) and xtlp['id'] != tlpid:
                mayuse = False
                break
            elif fixProjectCategory(xtlp['name']) == fixProjectCategory(entry['name']) and xtlp['id'] == tlpid:
                jiras.append(entry['key'])
                mayuse = False
                break
        if mayuse and 'projectCategory' in entry and fixProjectCategory(entry['projectCategory']['name']) == project:
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
            x = readJson(RAOHOME+"data/JIRA/%s.json" % project)
            refresh = False
            return x[0], x[1], x[2]
    except:
        pass
    if refresh:
        if sys.version_info >= (3, 0):
            base64string = base64.encodestring(('%s:%s' % ('githubbot', jirapass)).encode('ascii')).decode('ascii')[:-1]
        else:
            base64string = base64.encodestring('%s:%s' % ('githubbot', jirapass))[:-1]
        try:
            headers = {"Authorization": "Basic %s" % base64string}
            req = requests.get("""https://issues.apache.org/jira/rest/api/2/search?jql=project%20=%20'""" + project + """'%20AND%20created%20%3E=%20-91d""", headers = headers)
            cdata = req.json()
            req = requests.get("""https://issues.apache.org/jira/rest/api/2/search?jql=project%20=%20'""" + project + """'%20AND%20resolved%20%3E=%20-91d""", headers = headers)
            rdata = req.json()
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

lastPSummary = 0

def getProjectData(project = None):
        global lastPSummary
        if lastPSummary < (time.time() - CACHE_TIMEOUT):
            global pmcSummary
            pmcSummary = committee_info.PMCsummary()
            lastPSummary = time.time()
        x = {}
        y = []
        z = {}
        for xproject in pmcSummary:
            y.append(xproject)
            if xproject == project:
                x['name'] = pmcSummary[project]['name']
                x['chair'] = pmcSummary[project]['chair']
        if project:
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

groups = []

pmcSummary = None
dataHealth = None
pchanges = None
cchanges = None
bugzillastats = None
lastRead = 0
ml = None
mld = None
pmcdates = None
checker_json = None

def generate(user, project, runkibble):
    global lastRead
    if re.match(r"^[-a-zA-Z0-9_.]+$", user):
        isMember = isASFMember(user)
    
        groups = getPMCs(user)
        
        # Check if we need to re-read json inputs...
        if lastRead < (time.time() - CACHE_TIMEOUT):
            global pmcSummary, dataHealth,pchanges, cchanges, bugzillastats, ml, mld, pmcdates, checker_json
            pmcSummary = committee_info.PMCsummary()
            dataHealth = readJson(RAOHOME+"data/health.json", [])
            pchanges = readJson(RAOHOME+"data/pmcs.json")
            cchanges = readJson(RAOHOME+"data/projects.json")
            bugzillastats = readJson(RAOHOME+"data/bugzillastats.json", {})
            mld = readJson(RAOHOME+"data/maildata_extended.json")
            ml = readJson(RAOHOME+"data/mailinglists.json")
            pmcdates = readJson(RAOHOME+"data/pmcdates.json")
            # fetch checker_json from checker.apache.org ; use cache as fallback
            try:
                checker_json  = requests.get("https://checker.apache.org/json/", timeout = 1.0).json()
            except:
                checker_json = readJson(RAOHOME+"data/cache/checker.json", None)
            lastRead = time.time()
        
        emails = {}
        mlid = project # mailing list ID, might differ from ldap id
        for k, v in pmap.items():
            if v == project:
                mlid = k
        
        for entry in mld: # e.g. hc-dev, ant-users, ws-dev
            tlp = entry.split("-")[0]
            nentry = entry
            if tlp == "empire":
                tlp = "empire-db"
                nentry = entry.replace("empire-", "empire-db-")
            if tlp  == mlid:
                emails[nentry] = mld[entry]
                
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
        
        checker = {}
        
        group = project
    
        jiras = []
        count = [0,0]
        xgroup = group
        if group in ldapmap:
            xgroup = ldapmap[group]
        if xgroup in pchanges:
            count[0] = len(pchanges[xgroup])
        if xgroup in cchanges:
            count[1] = len(cchanges[xgroup])
        jdata = [0,0, None]
        ddata, allpmcs, health = getProjectData(group)
        rdata = getReleaseData(group)
        if group in bugzillastats:
            bdata = bugzillastats
        else:
            bdata = [0,0,{}]
        # a PMC may have projects using Bugzilla *and* JIRA - e.g. Tomcat - (or neither)
        jiraname = group.upper()
        if group in jmap:
            keys = []
            jdata[2] = []
            for jiraname in jmap:
                x,y, p = getJIRAS(jiraname)
                jdata[0] += x
                jdata[1] += y
                if x > 0 or y > 0:
                    jdata[2].append(p)
                keys.append(jiraname)
        elif 'name' in ddata:
            jiras = getJIRAProjects(ddata['name'], group)
            keys = jiras
            jdata[2] = []
            for jiraname in jiras:
                x,y,p= getJIRAS(jiraname)
                jdata[0] += x
                jdata[1] += y
                if x > 0 or y > 0:
                    jdata[2].append(p)
        elif jiraname:
            keys=[jiraname]
            x,y, p= getJIRAS(jiraname)
            jdata[0] += x
            jdata[1] += y
            jdata[2] = p

        cdata = cdata[xgroup] if xgroup in cdata else {'pmc': {}, 'committer': {}}
        for pmc in pchanges:
            if pmc == xgroup:
                for member in pchanges[pmc]:
                    if pchanges[pmc][member][1] > 0:
                        cdata['pmc'][member] = pchanges[pmc][member]
        for pmc in cchanges:
            if pmc == xgroup:
                for member in cchanges[pmc]:
                    if cchanges[pmc][member][1] > 0:
                        cdata['committer'][member] = cchanges[pmc][member]
        if group in pmcdates: # Make sure we have this PMC in the JSON, so as to not bork
            dates = pmcdates[group] # only send the groups we want
        if checker_json and 'meta' in checker_json and 'projects' in checker_json:
            meta = checker_json['meta']
            prjs = checker_json['projects']
            checker = prjs[group] if group in prjs else { 'errors': 0 }
            checker['meta'] = meta
        
        # Add in kibble data if called with only= OR only one project...
        kibble = None
        if runkibble:
            try:
                kibble = rapp.kibble.stats(project, jira = jdata[2], mlid = mlid)
            except:
                pass
            
        output = {
            'count': count,
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
    
        return output
    else:
        return {'okay': False, 'error': "Invalid user credentials!"}
