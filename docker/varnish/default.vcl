vcl 4.0;

# Define the backend server (now pointing to Nginx instead of Payload directly)
backend default {
    .host = "nginx";
    .port = "80";
    .connect_timeout = 5s;
    .first_byte_timeout = 60s;
    .between_bytes_timeout = 2s;
}

sub vcl_recv {
    # WebSocket support (pass to Nginx)
    if (req.http.upgrade ~ "(?i)websocket") {
        return (pipe);
    }

    # Don't cache admin/API routes
    if (req.url ~ "^/admin" || req.url ~ "^/api") {
        return (pass);
    }
    
    # Don't cache POST/PUT/DELETE requests
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }
    
    # Don't cache if there are cookies or authorization headers
    if (req.http.Authorization || req.http.Cookie) {
        return (pass);
    }
    
    # Cache everything else
    return (hash);
}

sub vcl_pipe {
    if (req.http.upgrade) {
        set bereq.http.upgrade = req.http.upgrade;
        set bereq.http.connection = req.http.connection;
    }
}

sub vcl_backend_response {
    # Set default TTL to 5 minutes if not specified by the backend
    if (beresp.ttl <= 0s || beresp.http.Set-Cookie || beresp.http.Vary == "*") {
        # Don't cache problematic responses
        set beresp.uncacheable = true;
        set beresp.ttl = 120s;
        return (deliver);
    } else {
        # Set a default cache time if none provided
        if (beresp.ttl <= 0s) {
            set beresp.ttl = 300s; // 5 minutes default
        }
    }
    return (deliver);
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