import urllib.request
import json
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/plan_step_complete',
    data=json.dumps({"message": "Done"}).encode('utf-8'),
    headers={'content-type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
except Exception as e:
    pass
