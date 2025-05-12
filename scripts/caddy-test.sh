#!/bin/bash
# caddy-test.sh - Script to test Caddy configuration

echo "Testing Caddy Configuration..."

# Variables
DOMAIN=${1:-localhost}
PROTOCOL=${2:-http} # Default to http for local testing, change to https if testing with SSL
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
    
    # Make the request
    # Add -k for https if using self-signed certs locally
    local curl_opts=""
    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="-k" # Allow insecure server connections for self-signed certs
    fi

    response=$(curl ${curl_opts} -s -o /dev/null -w "%{http_code}" "${url}")
    
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
    
    # Make the request and get headers
    local curl_opts=""
    if [ "$PROTOCOL" = "https" ]; then
        curl_opts="-k" 
    fi
    headers=$(curl ${curl_opts} -s -I "${url}")
    
    # Check for required security headers
    required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "Referrer-Policy"
        "Content-Security-Policy"
    )
    if [ "$PROTOCOL" = "https" ]; then
        required_headers+=("Strict-Transport-Security")
    fi

    all_ok=true
    for header_name in "${required_headers[@]}"; do
        # Case-insensitive grep for header name
        if echo "$headers" | grep -iq "^${header_name}:"; then
            echo "  ${header_name}: OK"
        else
            echo "  ${header_name}: MISSING"
            all_ok=false
        fi
    done

    if $all_ok; then
        echo "All required security headers present."
    else
        echo "Some required security headers are MISSING."
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
    
    # Check TLS version (example, adjust as needed)
    echo "  Testing TLS versions (expecting TLS 1.2+):"
    # Note: s_client might exit with 0 even if connection fails for some versions.
    # This is a basic check.
    for version_flag in "-tls1_2" "-tls1_3"; do
        version_name=$(echo $version_flag | sed 's/-//')
        # The < /dev/null is to prevent s_client from waiting for stdin
        if openssl s_client -connect "${domain_to_check}:443" "${version_flag}" -brief < /dev/null 2>/dev/null; then
            echo "    ${version_name}: Supported (or connection attempt made)"
        else
            echo "    ${version_name}: Not supported (or connection failed)"
        fi
    done
    
    # Check certificate validity (basic check for dates)
    echo "  Certificate information (dates):"
    # The </dev/null is important here
    cert_info=$(echo | openssl s_client -servername "${domain_to_check}" -connect "${domain_to_check}:443" 2>/dev/null | openssl x509 -noout -dates -issuer -subject)
    if [ -n "$cert_info" ]; then
        echo "$cert_info" | sed 's/^/    /'
    else
        echo "    Could not retrieve certificate information."
    fi
}

# Test basic endpoints
check_endpoint "${BASE_URL}/" "200" "Homepage"
check_endpoint "${BASE_URL}/api/health" "200" "API Health endpoint"
check_endpoint "${BASE_URL}/health.html" "200" "Frontend Health endpoint"
check_endpoint "${BASE_URL}/nonexistent-page-should-be-404" "404" "404 handling"

# Test security headers
check_security_headers "${BASE_URL}/"

# Test SSL if using HTTPS
if [ "$PROTOCOL" = "https" ]; then
    check_ssl "$DOMAIN"
fi

echo "Testing completed."
