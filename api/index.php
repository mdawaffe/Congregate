<?php

declare( strict_types = 1 );

namespace MDAWaffe\Swarm;

require 'rate-limit.php';

require 'api.php';
require 'store.php';
require 'store-fs.php';

require 'item.php';
require 'item-list.php';

require 'endpoints/checkin.php';
require 'endpoints/user.php';
require 'endpoints/venue.php';
require 'endpoints/venue-visited.php';
require 'endpoints/venue-liked.php';
require 'endpoints/curated-list.php';
require 'endpoints/photo.php';
require 'endpoints/tip.php';
require 'endpoints/taste.php';
require 'endpoints/activity.php';
