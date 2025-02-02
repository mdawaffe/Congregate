#!/bin/bash

set -e

php build.php

python3 -m http.server 3333 --directory client/
