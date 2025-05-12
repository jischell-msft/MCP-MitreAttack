#!/bin/bash
# caddy-test.sh - Script to test Caddy configuration

echo "Testing Caddy Configuration..."

# Variables
DOMAIN=${1:-localhost}
PROTOCOL=${2:-http} # Default to http for local testing; change to https if testing deployed certs
BASE_URL="${PROTOCOL}://${DOMAIN}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "curl is required but not installed. Please install curl."
    exit 1
fi

# Function to make a request and check response
check_endpoint() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    
    echo -n "Testing ${description} (${url})... "
    
    # Make the request (add -k for https if using self-signed certs locally)
    response=$(curl -s -o /dev/null -w "%{http_code}" "${url}" --max-time 5)
    
    # Check the response
    if [ "$response" = "$expected_status" ]; then
        echo "OK (Status: ${response})"
        return 0
    else
        echo "FAIL (Expected: ${expected_status}, Got: ${response})"
        return 1
    fi
}

# Function to check security headers
check_security_headers() {
    local url="$1"
    
    echo "Checking security headers for ${url}..."
    
    # Make the request and get headers (add -k for https if using self-signed certs locally)
    headers=$(curl -s -I "${url}")
    
    # Check for required security headers
    required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Referrer-Policy"
        "Content-Security-Policy"
    )
    # HSTS is only sent over HTTPS
    if [ "$PROTOCOL" = "https" ]; then
        required_headers+=("Strict-Transport-Security")
    fi

    all_present=true
    for header_name in "${required_headers[@]}"; do
        # Case-insensitive grep for header name
        if echo "$headers" | grep -qi "^${header_name}:"; then
            echo "  ${header_name}: OK"
        else
            echo "  ${header_name}: MISSING"
            all_present=false
        fi
    done

    if $all_present; then
        echo "All critical security headers are present."
    else
        echo "Some critical security headers are MISSING."
    fi
}

# Function to check SSL configuration
check_ssl() {
    local domain_to_check="$1"
    
    echo "Checking SSL configuration for ${domain_to_check}..."
    
    # Check if openssl is installed
    if ! command -v openssl &> /dev/null; then
        echo "  openssl is required for SSL testing but not installed."
        return
    fi
    
    # Check TLS version
    echo "  Testing TLS versions (should support TLS 1.2 and 1.3):"
    for version_flag in "-tls1_2" "-tls1_3"; do
        version_name=$(echo "$version_flag" | sed 's/-//')
        # openssl s_client exits with 0 on success, non-zero on failure
        # Mute stderr with 2>/dev/null, and stdout with >/dev/null
        # Send "QUIT" to close the connection cleanly
        if echo "QUIT" | openssl s_client -connect "${domain_to_check}:443" "${version_flag}" -quiet > /dev/null 2>&1; then
            echo "    ${version_name^^}: Supported"
        else
            echo "    ${version_name^^}: Not supported or error"
        fi
    done
    
    # Check certificate validity
    echo "  Certificate information (dates, issuer, subject):"
    # Send "QUIT" to close the connection cleanly
    cert_info=$(echo "QUIT" | openssl s_client -connect "${domain_to_check}:443" -servername "${domain_to_check}" </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer -subject)
    if [ -n "$cert_info" ]; then
        echo "$cert_info" | sed 's/^/    /'
    else
        echo "    Could not retrieve certificate information."
    fi
}

# Test basic endpoints
check_endpoint "${BASE_URL}/" "200" "Homepage"
check_endpoint "${BASE_URL}/api/health" "200" "API Health endpoint"
check_endpoint "${BASE_URL}/health" "200" "Frontend Health endpoint" # Assuming frontend serves /health
check_endpoint "${BASE_URL}/nonexistent-page-should-be-404" "404" "404 handling"

# Test security headers
check_security_headers "${BASE_URL}/"

# Test SSL if using HTTPS
if [ "$PROTOCOL" = "https" ]; then
    # If DOMAIN includes a port, strip it for check_ssl
    domain_no_port=$(echo "$DOMAIN" | awk -F: '{print $1}')
    check_ssl "$domain_no_port"
fi

echo "Testing completed."
