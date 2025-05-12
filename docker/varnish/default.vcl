vcl 4.1;

backend default {
    .host = "nginx";
    .port = "80";
    .connect_timeout = 30s;
    .first_byte_timeout = 60s;
    .between_bytes_timeout = 5s;
}

sub vcl_recv {
    # Remove all cookies to force caching
    unset req.http.Cookie;
    unset req.http.Authorization;
    
    # Important: Strip If-None-Match to force 200 responses instead of 304
    unset req.http.If-None-Match;
    unset req.http.If-Modified-Since;

    return (hash);
}

sub vcl_deliver {
    # Add cache status headers
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }
    
    # Add cache-control header if missing
    if (!resp.http.Cache-Control) {
        set resp.http.Cache-Control = "public, max-age=300";
    }
    
    return (deliver);
}

sub vcl_backend_response {
    # Force caching for 1 hour, even for 304 responses
    set beresp.ttl = 3600s;
    set beresp.grace = 86400s;
    
    # Remove any Set-Cookie headers to ensure caching
    unset beresp.http.Set-Cookie;
    
    # Special handling for 304 responses
    if (beresp.status == 304) {
        # Fetch a fresh copy instead
        return (retry);
    }
    
    return (deliver);
}