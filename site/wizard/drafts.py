#!/usr/bin/env python
""" script for fetching or saving board report drafts """
import os
import sys
import cgi
import time
import json
import requests
import re

RAO_HOME = '/var/www/reporter.apache.org'
sys.path.append("%s/scripts" % RAO_HOME) # module is below docroot
import committee_info
import urlutils

uc = urlutils.UrlCache(interval=1800, silent=True)

PROJECTS = 'https://whimsy.apache.org/public/public_ldap_projects.json'
MEMBER_INFO = 'https://whimsy.apache.org/public/member-info.json'
BASIC_AUTH = os.environ['HTTP_X_WHIMSY_AUTH'] if 'HTTP_X_WHIMSY_AUTH' in os.environ else ""
USER = os.environ['HTTP_X_AUTHENTICATED_USER'] if 'HTTP_X_AUTHENTICATED_USER' in os.environ else ""

def isMember(uid):
    """ Return true if ASF member, otherwise false """
    resp = uc.get(MEMBER_INFO, name=None, encoding='utf-8', errors=None)
    j = json.load(resp)
    resp.close()
    members = j['members']
    return uid in members
    
def getPMCs(uid):
    """ Return a list of projects user is on the PMC of """
    resp = uc.get(PROJECTS, name=None, encoding='utf-8', errors=None)
    j = json.load(resp)
    resp.close()
    projects = j['projects']
    groups = []
    for group in projects:
        if group != "incubator" and 'pmc' in projects[group]:
            if uid in projects[group]['owners']:
                groups.append(group)
    return groups


def main():
    
    # Get project requested, action, and committee data
    form = cgi.FieldStorage()
    pmcSummary = committee_info.PMCsummary()
    project = form.getvalue('project')
    action = form.getvalue('action')
    
    # Figure out our permissions
    member = isMember(USER)
    pmc = project in getPMCs(USER)
    
    dump = '{}'
    
    if not (member or pmc):
        action = 'invalid'
        dump = json.dumps({"error": "You need to be a member of this PMC or an ASF member to access drafts for the project."})
        
    if action == 'save':
        report = json.loads(form.getvalue('report'))
        report_compiled = form.getvalue('report_compiled')
        
        js = {
            'report': report,
            'report_compiled': report_compiled,
        }
        report_filename = "%s-%u-%s.json" % (project, time.time(), USER)
        with open("%s/drafts/%s" % (RAO_HOME, report_filename), "w") as f:
            f.write(json.dumps(js))
            f.close()
        
        dump = json.dumps({'filename': report_filename})
    
    elif action == 'index':
        whence = int(time.time() - (60*86400)) # Max 2 months ago!
        drafts = {}
        draft_files = [x for x in os.listdir("%s/drafts" % RAO_HOME) if x.endswith('.json')]
        for filename in draft_files:
            p, t, u = filename.split('-', 2)
            
            # If a file is way old, try deleting it.
            if t < whence:
                try:
                    os.unlink("%s/drafts/%s" % (RAO_HOME, filename))
                except:
                    pass
            
            # Else if for this project, add to the list
            elif p == project:
                u = u.replace('.json', '')
                drafts[t] = {'filename': filename, 'creator': u, 'yours': USER == u}
        
        dump = json.dumps( {
            'drafts': drafts
        })
    
    elif action == 'fetch':
        filename = form.getvalue('filename')
        p, t, u = filename.split('-', 2)
        if p == project and not re.search(r"[^-_.a-z0-9]", filename):
            draft = json.load(open("%s/drafts/%s" % (RAO_HOME, filename), "r"))
            dump = json.dumps(draft)
    
    elif action == 'delete':
        filename = form.getvalue('filename')
        p, t, u = filename.split('-', 2)
        dump = json.dumps({'message': "Could not remove draft: permission denied."})
        if p == project and not re.search(r"[^-_.a-z0-9]", filename):
            u = u.replace('.json', '')
            if u == USER:
                try:
                    os.unlink("%s/drafts/%s" % (RAO_HOME, filename))
                    dump = json.dumps({'message': "Draft successfully removed."})
                except:
                    pass
                
    
    sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
    sys.stdout.write(dump)

if __name__ == '__main__':
    main()
