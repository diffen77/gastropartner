#!/usr/bin/env python3
"""
Script to check API endpoints for missing authentication.
"""

import re
from pathlib import Path


def check_authentication(file_path: Path):
    """Check if API endpoints in a file have authentication."""
    content = file_path.read_text()

    # Find router definition
    router_match = re.search(r"router = APIRouter\((.*?)\)", content, re.DOTALL)
    router_has_auth = False
    if router_match:
        router_def = router_match.group(1)
        if "dependencies=" in router_def and (
            "require_superadmin" in router_def or "get_current_active_user" in router_def
        ):
            router_has_auth = True

    # Find all endpoints
    endpoint_pattern = re.compile(r"@router\.(get|post|put|delete|patch)\(([^)]*)\)")
    endpoints = []

    for match in endpoint_pattern.finditer(content):
        method = match.group(1)
        endpoint_def = match.group(2)
        start_pos = match.end()

        # Find the function definition - look for the entire function signature across multiple lines
        func_start = content.find("async def", start_pos)
        if func_start != -1:
            # Find the function name
            func_name_match = re.search(
                r"async def ([^(]+)\(", content[func_start : func_start + 100]
            )
            if func_name_match:
                func_name = func_name_match.group(1)

                # Find the complete function signature (may span multiple lines)
                paren_count = 0
                func_def_start = content.find("(", func_start)
                func_def_end = func_def_start

                for i, char in enumerate(content[func_def_start : func_def_start + 2000]):
                    if char == "(":
                        paren_count += 1
                    elif char == ")":
                        paren_count -= 1
                        if paren_count == 0:
                            func_def_end = func_def_start + i + 1
                            break

                func_signature = content[func_def_start:func_def_end]

                # Check if function has authentication
                has_auth = (
                    router_has_auth
                    or "current_user" in func_signature
                    or "get_current_active_user" in func_signature
                    or "require_superadmin" in func_signature
                    or "Depends(get_current_user)" in func_signature
                    or "get_user_organization" in func_signature
                )

                # Extract endpoint path
                path_match = re.search(r'"([^"]*)"', endpoint_def)
                endpoint_path = path_match.group(1) if path_match else "unknown"

                endpoints.append(
                    {
                        "method": method.upper(),
                        "path": endpoint_path,
                        "function": func_name,
                        "has_auth": has_auth,
                    }
                )

    return {"file": file_path.name, "router_has_auth": router_has_auth, "endpoints": endpoints}


def main():
    """Check all API files."""
    api_dir = Path("src/gastropartner/api")

    print("🔐 Checking API endpoint authentication...")
    print("=" * 60)

    missing_auth_count = 0

    for py_file in api_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        result = check_authentication(py_file)

        # Count endpoints without authentication
        unauthenticated = [ep for ep in result["endpoints"] if not ep["has_auth"]]

        if unauthenticated:
            print(f"\n⚠️  {result['file']}")
            print(f"   Router auth: {'✅' if result['router_has_auth'] else '❌'}")
            print("   Unauthenticated endpoints:")

            for ep in unauthenticated:
                print(f"     {ep['method']} {ep['path']} -> {ep['function']}()")
                missing_auth_count += 1
        else:
            print(f"✅ {result['file']} - All endpoints authenticated")

    print(f"\n{'=' * 60}")
    print(f"📊 SUMMARY: {missing_auth_count} endpoints missing authentication")

    if missing_auth_count > 0:
        print("🚨 SECURITY ISSUE: Fix these endpoints before deployment!")
        return False
    else:
        print("🎉 All endpoints are properly authenticated!")
        return True


if __name__ == "__main__":
    main()
