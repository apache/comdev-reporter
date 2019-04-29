"""

Module to give access to data from member-info.json

This module acts as the gatekeeper for all access to member-info.json
which is cached from https://whimsy.apache.org/public/member-info.json

"""

import json
from urlutils import UrlCache

MEMBER_INFO='https://whimsy.apache.org/public/member-info.json'


# Don't check more often than every minute
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

# Only want the members
memberdata = loadJson(MEMBER_INFO)

def isASFMember(uid):
    return uid in memberdata['members']

if __name__ == '__main__':
    import sys
    for arg in sys.argv[1:]:
        print("%s isASFMember: %s" % (arg, isASFMember(arg)))
