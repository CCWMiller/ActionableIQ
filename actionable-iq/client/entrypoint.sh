    #!/bin/sh
    # Exit immediately if a command exits with a non-zero status.
    set -e

    echo "--- Running entrypoint.sh ---"

    echo "--- Checking /usr/share/nginx/html ---"
    ls -lR /usr/share/nginx/html || echo "WARN: Failed to list /usr/share/nginx/html"

    echo "--- Checking /etc/nginx/conf.d ---"
    ls -l /etc/nginx/conf.d || echo "WARN: Failed to list /etc/nginx/conf.d"
    echo "--- Contents of default.conf ---"
    cat /etc/nginx/conf.d/default.conf || echo "WARN: Failed to cat default.conf"

    echo "--- Validating Nginx configuration ---"
    nginx -t

    echo "--- Starting Nginx ---"
    # Use exec to replace the shell process with nginx, so signals are handled correctly
    exec nginx -g 'daemon off;'

    # If nginx exits immediately, this line might be reached (less likely with exec)
    echo "--- Nginx process exited ---"
    exit 1 # Explicitly exit with error if nginx stops immediately