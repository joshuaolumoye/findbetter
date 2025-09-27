#!/usr/bin/env bash

# Path to your PDF file
PDF_FILE="./Versicherungsantrag_template.pdf"

# Convert PDF to Base64 and store in a variable
BASE64_PDF=$(base64 -w 0 "$PDF_FILE")

# Create JSON payload and write to a file
cat > payload.json <<EOF
{
  "title": "Example contract",
  "message": "Please sign this document!",
  "content": "${BASE64_PDF}",
  "signatures": [
    {
      "account_email": "joshuaolumoye@gmail.com"
    },
    {
      "account_email": "joshuaolumoye3@gmail.com"
    }
  ]
}
EOF

# API endpoint
URL="https://api.skribble.de/v2/signature-requests"

# Make the API request, reading data from file
  curl -v -X POST "$URL" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJwYWZwNkpDWFNFYlM0U3h6a1ZVTnYwMldfdGl3Y05wbWVjcTlQS1ZHdE1rIn0.eyJleHAiOjE3NTg4MjEyNzQsImlhdCI6MTc1ODgyMDA3NCwianRpIjoiOGQ3NjkxYWMtYjcxOS00OTczLThlOTItMWEwMjBjNWY5YzA2IiwiaXNzIjoiaHR0cHM6Ly9rYy5za3JpYmJsZS5kZS9hdXRoL3JlYWxtcy9za3JpYmJsZSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiIxODkxN2QzNS02OTdmLTRmMWUtYmRkZS1lZGJhZmE4YzU3ZjkiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJsb2dpbiIsInNlc3Npb25fc3RhdGUiOiIzNjdmZGI1Mi00YmE0LTQ3Y2EtYjhiZC02ODJhZGZiOTJmZjAiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1za3JpYmJsZSIsIlJPTEVfVVNFUiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50Iiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJwcm9maWxlIGVtYWlsIG9wZW5pZCIsInNpZCI6IjM2N2ZkYjUyLTRiYTQtNDdjYS1iOGJkLTY4MmFkZmI5MmZmMCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLXNrcmliYmxlIiwiUk9MRV9VU0VSIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdLCJuYW1lIjoiY29tcGFuaW94IiwiY3JlYXRlZF9hdCI6IjE3NTg2MzUwMzUxNDAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhcGlfZGVtb19jb21wYW5pb3hfMTVkMV8xIiwiZ2l2ZW5fbmFtZSI6ImNvbXBhbmlveCJ9.hWyg4Q2jfZSgBPq2zRHgwnvVFeidybiHXPfPVvap7ixwpGhOkEWg0s8oA5JCFChKM5Xx2_klgnAnvfMT2Kx_Iy7Mbil8j1sVT4ULDjsJ7xhWXHKfvtUeC7xnay1IeHa5olxLoxfJY-wsyOYZ6KiV51j8NEUT0tDsM3TFy8iIcldIYyOYZGZRVwRdcu6PsOwQ12-_Aokbnu9OFHL--Z-4FB_4S-MYRzu6DVIDTSX0NcaevNQ9iljYbOBD4RsqOnpI4oBVaut4HtDAMaY55JAPT461mgn_WjiOEFqfCKJ_f8P1DS-4wtQWqi4qoCsbeY_Wu6xsDMY8T7lGJV4V3AgOOw" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary "@payload.json" \
  -w "\n\nHTTP STATUS: %{http_code}\n"

