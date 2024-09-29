#!/bin/bash

set -e

php build.php

php -S localhost:3333 -t client/
# python3 -m http.server 3333 --directory client/
