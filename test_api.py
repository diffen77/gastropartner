#!/usr/bin/env python3
"""Test script to verify organizations API is working."""

import requests
import json

# Get auth token
login_response = requests.post(
    "http://localhost:8182/api/v1/auth/dev-login",
    json={"email": "lediff@gmail.com", "password": "Password8!"}
)

print("=== LOGIN RESPONSE ===")
print(f"Status: {login_response.status_code}")
print(json.dumps(login_response.json(), indent=2))

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"\n=== TOKEN: {token} ===")
    
    # Test organizations API
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== ORGANIZATIONS API ===")
    orgs_response = requests.get("http://localhost:8182/api/v1/organizations/", headers=headers)
    print(f"Status: {orgs_response.status_code}")
    print(f"Response: {orgs_response.text}")
    
    print("\n=== DEBUG ENDPOINT ===")
    debug_response = requests.get("http://localhost:8182/api/v1/organizations/debug", headers=headers)
    print(f"Status: {debug_response.status_code}")
    print(json.dumps(debug_response.json(), indent=2))
    
    print("\n=== DEBUG-LIST ENDPOINT ===")
    debug_list_response = requests.get("http://localhost:8182/api/v1/organizations/debug-list", headers=headers)
    print(f"Status: {debug_list_response.status_code}")
    print(json.dumps(debug_list_response.json(), indent=2))