import urllib.request
import json
import os
from string import Template
from pprint import pprint

schema = '''
  query { 
    listProductsByTitle(
      title: "X100"
      count: 5
      $next_token_line
    ) { 
      products {
        id
        title
      }
      nextToken
    }
  }
'''

template = Template(schema)

headers = {
  'x-api-key': os.environ['API_KEY'],
  'Content-Type': 'application/graphql'
}

next_token_line = ''

while True:
  query = template.substitute(next_token_line=next_token_line)
  data = json.dumps({ 'query': query }).encode('utf-8')
  req = urllib.request.Request(url=os.environ['GRAPHQL_ENDPOINT'], data=data, headers=headers, method='POST')
  f = urllib.request.urlopen(req)
  content =json.loads( f.read().decode('utf-8'))
  pprint(content)
  if content['data']['listProductsByTitle']['nextToken']:
    next_token_line = 'nextToken: "{}"'.format(content['data']['listProductsByTitle']['nextToken'])
  else:
    break
  