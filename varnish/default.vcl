vcl 4.1;

import directors;
import std;

# Backend definition (your Payload CMS app)
backend payload_backend {
    .host = "payload";
    .port = "3000";
    .connect_timeout = 5s;
    .first_byte_timeout = 90s;
    .between_bytes_timeout = 2s;
    .max_connections = 300;
}

sub vcl_init {
    new payload_director = directors.round_robin();
    payload_director.add_backend(payload_backend);
}

# Decide whether to use the cache
sub vcl_recv {
    # Set the director
    set req.backend_hint = payload_director.backend();

    # Normalize the host header
    if (req.http.host) {
        set req.http.host = regsub(req.http.host, ":[0-9]+", "");
    }

    # Normalize the query arguments
    set req.url = std.querysort(req.url);

    # Cache only GET or HEAD requests
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }

    # Don't cache admin or API routes except for GET requests to read-only API endpoints
    if (req.url ~ "^/admin" || 
        (req.url ~ "^/api" && !(req.url ~ "^/api/[^/]+$" && req.method == "GET"))) {
        return (pass);
    }

    # Strip cookies for static files
    if (req.url ~ "\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)(\?.*)?$") {
        unset req.http.Cookie;
        return (hash);
    }

    # Remove all cookies for anonymous users
    if (!req.http.Cookie ~ "payload-token") {
        unset req.http.Cookie;
    }

    # If there are still cookies, skip the cache
    if (req.http.Cookie) {
        return (pass);
    }

    return (hash);
}

sub vcl_backend_response {
    # Set TTL to 1 hour for static files
    if (bereq.url ~ "\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)(\?.*)?$") {
        set beresp.ttl = 1h;
        set beresp.uncacheable = false;
        return (deliver);
    }

    # For HTML content
    if (beresp.http.Content-Type ~ "text/html") {
        set beresp.ttl = 5m;
        set beresp.uncacheable = false;
        return (deliver);
    }
    
    # For JSON API responses
    if (beresp.http.Content-Type ~ "application/json") {
        set beresp.ttl = 2m;
        set beresp.uncacheable = false;
        return (deliver);
    }

    # Don't cache 5xx responses
    if (beresp.status >= 500 && beresp.status <= 599) {
        set beresp.uncacheable = true;
        return (deliver);
    }

    # Default caching behavior
    set beresp.ttl = 1m;
    set beresp.uncacheable = false;
    return (deliver);
}

sub vcl_deliver {
    # Add debugging headers to see if it was a cache hit
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
    } else {
        set resp.http.X-Cache = "MISS";
    }
    set resp.http.X-Cache-Hits = obj.hits;
    
    return (deliver);
}

# Health check
sub vcl_backend_fetch {
    return (fetch);
}

# Handle purge requests
sub vcl_purge {
    return (synth(200, "Purged"));
}