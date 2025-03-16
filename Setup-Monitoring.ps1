# PowerShell DDoS Protection Testing Script

# Test settings
$HOST = "localhost"
$DIRECT_PORT = "3000"  # Direct to Payload
$CACHED_PORT = "80"    # Through Varnish
$REQUESTS = 1000

# Create results directory
$RESULTS_DIR = "ddos_test_results"
if (-not (Test-Path $RESULTS_DIR)) {
    New-Item -Path $RESULTS_DIR -ItemType Directory | Out-Null
}
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RESULT_FILE = "$RESULTS_DIR\ddos_test_$DATE.txt"

# Check if ab (Apache Benchmark) is installed
if (-not (Get-Command ab -ErrorAction SilentlyContinue)) {
    Write-Host "Apache Benchmark (ab) is not installed. Please install it first." -ForegroundColor Red
    Write-Host "You can download it as part of Apache HTTP Server or use tools like chocolatey:" -ForegroundColor Red
    Write-Host "  choco install apache-httpd" -ForegroundColor Yellow
    exit 1
}

"===== DDoS PROTECTION TEST RESULTS =====" | Out-File -FilePath $RESULT_FILE
"Date: $DATE" | Out-File -FilePath $RESULT_FILE -Append
"=======================================" | Out-File -FilePath $RESULT_FILE -Append
"" | Out-File -FilePath $RESULT_FILE -Append

Write-Host "===== DDoS PROTECTION TEST RESULTS =====" -ForegroundColor Cyan
Write-Host "Date: $DATE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# URLs to test - customize these based on your application
$URLS = @(
  "/"
  "/api/blogs"  # Adjust to match your API endpoints
  "/assets/main.css"  # Adjust to match your static assets
)

# Increasing concurrency levels to simulate DDoS
$CONCURRENCY = @(10, 50, 100, 200, 300, 500)

# Run tests for each URL
foreach ($url in $URLS) {
  Write-Host "Testing URL: $url" -ForegroundColor Yellow
  "Testing URL: $url" | Out-File -FilePath $RESULT_FILE -Append
  "----------------" | Out-File -FilePath $RESULT_FILE -Append
  
  # Run tests with increasing concurrency
  foreach ($c in $CONCURRENCY) {
    "" | Out-File -FilePath $RESULT_FILE -Append
    "Concurrency: $c" | Out-File -FilePath $RESULT_FILE -Append
    
    Write-Host "`nConcurrency: $c" -ForegroundColor Blue
    
    # Test direct access (no cache)
    "" | Out-File -FilePath $RESULT_FILE -Append
    "WITHOUT CACHE (Direct to Payload):" | Out-File -FilePath $RESULT_FILE -Append
    
    Write-Host "WITHOUT CACHE (Direct to Payload):" -ForegroundColor Red
    
    # Only run the direct test with lower concurrency to avoid overwhelming the server
    if ($c -le 100) {
      $directResult = ab -n $REQUESTS -c $c -H "Accept-Encoding: gzip, deflate" "http://$HOST`:$DIRECT_PORT$url" 2>&1
      $filteredDirectResult = $directResult | Select-String -Pattern "Requests per second|Time per request|Failed requests|Complete requests"
      $filteredDirectResult | Out-File -FilePath $RESULT_FILE -Append
      $filteredDirectResult | ForEach-Object { Write-Host $_ }
    } else {
      "Skipping direct test at high concurrency ($c) to avoid server overload" | Out-File -FilePath $RESULT_FILE -Append
      Write-Host "Skipping direct test at high concurrency ($c) to avoid server overload" -ForegroundColor Yellow
    }
    
    # Wait a bit
    Start-Sleep -Seconds 2
    
    # Test cached access (through Varnish)
    "" | Out-File -FilePath $RESULT_FILE -Append
    "WITH CACHE (Through Varnish):" | Out-File -FilePath $RESULT_FILE -Append
    
    Write-Host "`nWITH CACHE (Through Varnish):" -ForegroundColor Green
    
    $cachedResult = ab -n $REQUESTS -c $c -H "Accept-Encoding: gzip, deflate" "http://$HOST`:$CACHED_PORT$url" 2>&1
    $filteredCachedResult = $cachedResult | Select-String -Pattern "Requests per second|Time per request|Failed requests|Complete requests"
    $filteredCachedResult | Out-File -FilePath $RESULT_FILE -Append
    $filteredCachedResult | ForEach-Object { Write-Host $_ }
    
    # Wait between tests
    Start-Sleep -Seconds 5
    
    "" | Out-File -FilePath $RESULT_FILE -Append
    "--------------------" | Out-File -FilePath $RESULT_FILE -Append
  }
  
  "" | Out-File -FilePath $RESULT_FILE -Append
  "=======================================" | Out-File -FilePath $RESULT_FILE -Append
  "" | Out-File -FilePath $RESULT_FILE -Append
}

# Get cache hit rates from monitoring
Write-Host "`nCollecting Cache Statistics..." -ForegroundColor Yellow
"Collecting Cache Statistics..." | Out-File -FilePath $RESULT_FILE -Append
"===========================" | Out-File -FilePath $RESULT_FILE -Append

# Get Varnish statistics
Write-Host "Varnish Cache Statistics:" -ForegroundColor Blue
"Varnish Cache Statistics:" | Out-File -FilePath $RESULT_FILE -Append
"-----------------------" | Out-File -FilePath $RESULT_FILE -Append

$varnishStats = docker-compose exec -T varnish varnishstat -1 | Select-String -Pattern "MAIN.cache_hit|MAIN.cache_miss|MAIN.client_req"
$varnishStats | Out-File -FilePath $RESULT_FILE -Append
$varnishStats | ForEach-Object { Write-Host $_ }

# Calculate Varnish hit rate
$hits = (docker-compose exec -T varnish varnishstat -1 -f MAIN.cache_hit | ForEach-Object { $_ -replace '\s+', ' ' } | ForEach-Object { ($_ -split ' ')[1] })
$misses = (docker-compose exec -T varnish varnishstat -1 -f MAIN.cache_miss | ForEach-Object { $_ -replace '\s+', ' ' } | ForEach-Object { ($_ -split ' ')[1] })

if ($hits -and $misses) {
  $total = [int]$hits + [int]$misses
  if ($total -gt 0) {
    $hit_rate = [math]::Round(([int]$hits / $total) * 100, 2)
    "Varnish Hit Rate: $hit_rate%" | Out-File -FilePath $RESULT_FILE -Append
    Write-Host "Varnish Hit Rate: $hit_rate%" -ForegroundColor Green
  } else {
    "Varnish Hit Rate: N/A (no requests yet)" | Out-File -FilePath $RESULT_FILE -Append
    Write-Host "Varnish Hit Rate: N/A (no requests yet)" -ForegroundColor Yellow
  }
} else {
  "Couldn't calculate hit ratio (check if Varnish is running)" | Out-File -FilePath $RESULT_FILE -Append
  Write-Host "Couldn't calculate hit ratio (check if Varnish is running)" -ForegroundColor Yellow
}

"" | Out-File -FilePath $RESULT_FILE -Append

# Get Redis statistics
Write-Host "`nRedis Cache Statistics:" -ForegroundColor Blue
"Redis Cache Statistics:" | Out-File -FilePath $RESULT_FILE -Append
"---------------------" | Out-File -FilePath $RESULT_FILE -Append

$redisStats = docker-compose exec -T redis redis-cli info stats | Select-String -Pattern "keyspace_hits|keyspace_misses"
$redisStats | Out-File -FilePath $RESULT_FILE -Append
$redisStats | ForEach-Object { Write-Host $_ }

# Calculate Redis hit rate
$redis_hits = (docker-compose exec -T redis redis-cli info stats | Select-String -Pattern "keyspace_hits" | ForEach-Object { ($_ -split ':')[1] })
$redis_misses = (docker-compose exec -T redis redis-cli info stats | Select-String -Pattern "keyspace_misses" | ForEach-Object { ($_ -split ':')[1] })

if ($redis_hits -and $redis_misses) {
  $redis_total = [int]$redis_hits + [int]$redis_misses
  if ($redis_total -gt 0) {
    $redis_hit_rate = [math]::Round(([int]$redis_hits / $redis_total) * 100, 2)
    "Redis Hit Rate: $redis_hit_rate%" | Out-File -FilePath $RESULT_FILE -Append
    Write-Host "Redis Hit Rate: $redis_hit_rate%" -ForegroundColor Green
  } else {
    "Redis Hit Rate: N/A (no requests yet)" | Out-File -FilePath $RESULT_FILE -Append
    Write-Host "Redis Hit Rate: N/A (no requests yet)" -ForegroundColor Yellow
  }
} else {
  "Couldn't calculate Redis hit ratio" | Out-File -FilePath $RESULT_FILE -Append
  Write-Host "Couldn't calculate Redis hit ratio" -ForegroundColor Yellow
}

"" | Out-File -FilePath $RESULT_FILE -Append
"Test completed!" | Out-File -FilePath $RESULT_FILE -Append
"Results saved to: $RESULT_FILE" | Out-File -FilePath $RESULT_FILE -Append

Write-Host "`nTest completed!" -ForegroundColor Green
Write-Host "Results saved to: $RESULT_FILE" -ForegroundColor Cyan