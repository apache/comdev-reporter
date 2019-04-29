"""

Module to give access to LDAP data from Whimsy public JSON files

This module acts as the gatekeeper for all access to Whimsy LDAP json data
which is cached from https://whimsy.apache.org/public/

"""

import json
from urlutils import UrlCache

GROUPS = 'https://whimsy.apache.org/public/public_ldap_groups.json'
PROJECTS= 'https://whimsy.apache.org/public/public_ldap_projects.json'


# Don't check more often than every minute (used by webapp as well as cronjobs)
uc = UrlCache(interval=60, silent=True)

def loadJson(url):
    resp = uc.get(url, name=None, encoding='utf-8', errors=None)
    try:
        content = resp.read() # json.load() does this anyway
        try:
            j = json.loads(content)
        except Exception as e:
            # The Proxy error response is around 4800 bytes
            print("Error parsing response:\n%s" % content[0:4800])
            raise e
    finally:
        resp.close()
    return j

def getPMCownership(uid):
    """Returns the array of LDAP project groups where the uid is in the owner list. Excludes incubator"""
    projects = loadJson(PROJECTS)['projects']
    groups = []
    for group in projects:
        if group != "incubator" and 'pmc' in projects[group]:
            if uid in projects[group]['owners']:
                groups.append(group)
    return groups

def isMember(uid):
    """Determine if the uid is in the member Unix group"""
    return uid in loadJson(GROUPS)['groups']['member']['roster']

if __name__ == '__main__':
    import sys
    for arg in sys.argv[1:]:
        print("%s isMember: %s" % (arg, isMember(arg)))
        print("%s PMCownership: %s" % (arg, getPMCownership(arg)))
