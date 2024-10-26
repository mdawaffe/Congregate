#!/bin/bash

set -e

BUILD=1
ARGS=()
for ARG in "$@"; do
	if [ "--no-build" = "$ARG" ]; then
		BUILD=0
	else
		ARGS+=( "$ARG" )
	fi
done
set -- "${ARGS[@]}"


if [ $BUILD -eq 1 ]; then
	php build.php
fi

php -S localhost:3333 -t client/
# python3 -m http.server 3333 --directory client/
