#!/usr/bin/env python
""" script for fetching comments from the board on previous reports """
import os
import sys
import cgi
import time
import json
import requests

RAO_HOME = '/var/www/reporter.apache.org'
sys.path.append("%s/scripts" % RAO_HOME) # module is below docroot
import committee_info
import urlutils

uc = urlutils.UrlCache(interval=1800, silent=True)

COMMENTS = 'https://whimsy.apache.org/board/agenda/json/historical-comments'
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
    
    # Get project requested and committee data
    form = cgi.FieldStorage()
    pmcSummary = committee_info.PMCsummary()
    project = form.getvalue('project')
    
    # If auth passed along and project is valid, go look for comments
    if BASIC_AUTH and project and project in pmcSummary:
        
        # Fetch comments from cache or whimsy (hackish!)
        wanted_file = "%s/tmp/comments_cache.json" % RAO_HOME
        if (os.path.exists(wanted_file) and os.path.getmtime(wanted_file) > (time.time() - 7200)):
            rv = json.load(open(wanted_file, "r"))
            cached = True
        else:
            try:
                orv = json.load(open(wanted_file, "r"))
                rv = requests.get(COMMENTS, headers = {'Authorization': BASIC_AUTH}).json()
            except:
                dump = json.dumps({
                    "error": "Invalid credentials provided, could not access board comments!"
                })
                sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
                sys.stdout.write(dump)
                return
            # interleave new within old
            for project in rv:
                orv[project] = rv[project]
            with open(wanted_file, "w") as f:
                f.write(json.dumps(orv))
            cached = False
        
        # Figure out how we're able to access this data
        member = isMember(USER)
        pmc = project in getPMCs(USER)
        pname = project
        if project in pmcSummary:
            pname = pmcSummary[project]['name'].replace('Apache ', '')
        cmt = {}
        
        # If we can access, fetch comments
        if rv and pname in rv and (pmc or member):
            cmt = rv[pname]
        
        # Form and dump json
        js = {
            "pid": project,
            "pname": pname,
            "comments": cmt,
            "is_member": member,
            "is_pmc": pmc,
            "used_cache": cached,
        }
        dump = json.dumps(js, indent = 2)
        sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
        sys.stdout.write(dump)
    else:
        dump = json.dumps({
            "error": "Invalid project or credentials provided!"
        })
        sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
        sys.stdout.write(dump)

if __name__ == '__main__':
    main()
