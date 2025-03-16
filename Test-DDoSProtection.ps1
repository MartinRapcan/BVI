#!/bin/bash
# DDoS Protection Testing Script

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test settings
HOST="localhost"
DIRECT_PORT="3000"  # Direct to Payload
CACHED_PORT="80"    # Through Varnish
REQUESTS=1000

# Create results directory
RESULTS_DIR="ddos_test_results"
mkdir -p "$RESULTS_DIR"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
RESULT_FILE="$RESULTS_DIR/ddos_test_$DATE.txt"

# Check if ab (Apache Benchmark) is installed
if ! command -v ab &> /dev/null; then
    echo -e "${RED}Apache Benchmark (ab) is not installed. Please install it first:${NC}"
    echo -e "  - Ubuntu/Debian: ${YELLOW}sudo apt-get install apache2-utils${NC}"
    echo -e "  - CentOS/RHEL: ${YELLOW}sudo yum install httpd-tools${NC}"
    echo -e "  - macOS: ${YELLOW}brew install httpd${NC}"
    exit 1
fi

echo -e "${BLUE}===== DDoS PROTECTION TEST RESULTS =====${NC}" | tee "$RESULT_FILE"
echo -e "Date: $DATE" | tee -a "$RESULT_FILE"
echo -e "=======================================" | tee -a "$RESULT_FILE"
echo "" | tee -a "$RESULT_FILE"

# URLs to test - customize these based on your application
URLS=(
  "/"
  "/api/blogs"  # Adjust to match your API endpoints
  "/assets/main.css"  # Adjust to match your static assets
)

# Increasing concurrency levels to simulate DDoS
CONCURRENCY=(10 50 100 200 300 500)

# Run tests for each URL
for url in "${URLS[@]}"; do
  echo -e "${YELLOW}Testing URL: $url${NC}" | tee -a "$RESULT_FILE"
  echo -e "----------------" | tee -a "$RESULT_FILE"
  
  # Run tests with increasing concurrency
  for c in "${CONCURRENCY[@]}"; do
    echo "" | tee -a "$RESULT_FILE"
    echo -e "${BLUE}Concurrency: $c${NC}" | tee -a "$RESULT_FILE"
    
    # Test direct access (no cache)
    echo "" | tee -a "$RESULT_FILE"
    echo -e "${RED}WITHOUT CACHE (Direct to Payload):${NC}" | tee -a "$RESULT_FILE"
    
    # Only run the direct test with lower concurrency to avoid overwhelming the server
    if [ $c -le 100 ]; then
      ab -n $REQUESTS -c $c -H "Accept-Encoding: gzip, deflate" "http://$HOST:$DIRECT_PORT$url" 2>&1 | grep -E "Requests per second|Time per request|Failed requests|Complete requests" | tee -a "$RESULT_FILE"
    else
      echo -e "${YELLOW}Skipping direct test at high concurrency ($c) to avoid server overload${NC}" | tee -a "$RESULT_FILE"
    fi
    
    # Wait a bit
    sleep 2
    
    # Test cached access (through Varnish)
    echo "" | tee -a "$RESULT_FILE"
    echo -e "${GREEN}WITH CACHE (Through Varnish):${NC}" | tee -a "$RESULT_FILE"
    ab -n $REQUESTS -c $c -H "Accept-Encoding: gzip, deflate" "http://$HOST:$CACHED_PORT$url" 2>&1 | grep -E "Requests per second|Time per request|Failed requests|Complete requests" | tee -a "$RESULT_FILE"
    
    # Wait between tests
    sleep 5
    
    echo "" | tee -a "$RESULT_FILE"
    echo -e "--------------------" | tee -a "$RESULT_FILE"
  done
  
  echo "" | tee -a "$RESULT_FILE"
  echo -e "=======================================" | tee -a "$RESULT_FILE"
  echo "" | tee -a "$RESULT_FILE"
done

# Get cache hit rates from monitoring
echo -e "${YELLOW}Collecting Cache Statistics...${NC}" | tee -a "$RESULT_FILE"
echo -e "===========================" | tee -a "$RESULT_FILE"

# Get Varnish statistics
echo -e "${BLUE}Varnish Cache Statistics:${NC}" | tee -a "$RESULT_FILE"
echo -e "-----------------------" | tee -a "$RESULT_FILE"
docker-compose exec varnish varnishstat -1 | grep -E "MAIN.cache_hit|MAIN.cache_miss|MAIN.client_req" | tee -a "$RESULT_FILE"

# Calculate Varnish hit rate
hits=$(docker-compose exec varnish varnishstat -1 -f MAIN.cache_hit | awk '{print $2}')
misses=$(docker-compose exec varnish varnishstat -1 -f MAIN.cache_miss | awk '{print $2}')
total=$((hits + misses))

if [ $total -gt 0 ]; then
  hit_rate=$(awk "BEGIN { printf \"%.2f\", ($hits / $total) * 100 }")
  echo -e "${GREEN}Varnish Hit Rate: $hit_rate%${NC}" | tee -a "$RESULT_FILE"
else
  echo -e "${YELLOW}Varnish Hit Rate: N/A (no requests yet)${NC}" | tee -a "$RESULT_FILE"
fi

echo "" | tee -a "$RESULT_FILE"

# Get Redis statistics
echo -e "${BLUE}Redis Cache Statistics:${NC}" | tee -a "$RESULT_FILE"
echo -e "---------------------" | tee -a "$RESULT_FILE"
docker-compose exec redis redis-cli info stats | grep -E "keyspace_hits|keyspace_misses" | tee -a "$RESULT_FILE"

# Calculate Redis hit rate
redis_hits=$(docker-compose exec redis redis-cli info stats | grep keyspace_hits | cut -d: -f2)
redis_misses=$(docker-compose exec redis redis-cli info stats | grep keyspace_misses | cut -d: -f2)
redis_total=$((redis_hits + redis_misses))

if [ $redis_total -gt 0 ]; then
  redis_hit_rate=$(awk "BEGIN { printf \"%.2f\", ($redis_hits / $redis_total) * 100 }")
  echo -e "${GREEN}Redis Hit Rate: $redis_hit_rate%${NC}" | tee -a "$RESULT_FILE"
else
  echo -e "${YELLOW}Redis Hit Rate: N/A (no requests yet)${NC}" | tee -a "$RESULT_FILE"
fi

echo "" | tee -a "$RESULT_FILE"
echo -e "${GREEN}Test completed!${NC}" | tee -a "$RESULT_FILE"
echo -e "Results saved to: ${BLUE}$RESULT_FILE${NC}" | tee -a "$RESULT_FILE"