vcl 4.0;

backend default {
    .host = "nginx";
    .port = "80";
}

sub vcl_recv {
    # Skip caching for POST/PUT/DELETE
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }
    
    # Handle websockets
    if (req.http.Upgrade ~ "(?i)websocket") {
        return (pipe);
    }
    
    # Remove all cookies to force caching
    unset req.http.Cookie;
    unset req.http.Authorization;
    
    # Important: Strip If-None-Match to force 200 responses instead of 304
    unset req.http.If-None-Match;
    unset req.http.If-Modified-Since;
    
    return (hash);
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

sub vcl_deliver {
    # Debug headers
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }
    
    return (deliver);
}

sub vcl_pipe {
    # For websockets
    if (req.http.upgrade) {
        set bereq.http.upgrade = req.http.upgrade;
        set bereq.http.connection = req.http.connection;
    }
}