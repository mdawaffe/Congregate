<?php

declare(strict_types=1);

namespace MDAWaffe\Swarm;

use MDAWaffe\Swarm\API\Exception\Rate_Limit;
use MDAWaffe\Swarm\API\Store_FS;

require __DIR__ . '/api/index.php';

$rest_index = null;
$options = getopt(
	'',
	[
		'token::', // (int) Which access token to use. 0-indexed line number of ./.access-token. Default = 0.
	],
	$rest_index
);
$options['token'] = (int) ( $options['token'] ?? 0 );

$positional_args = array_slice( $argv, $rest_index );

if ( count( $positional_args ) < 2 ) {
	echo "php $argv[0] TYPE ID\n";
	exit( 1 );
}

$access_token = trim( file( __DIR__ . '/.access-token' )[ $options['token'] ] );
if ( ! $access_token ) {
	exit( 1 );
}

$store_dir = __DIR__ . '/store';

$api = new API( $access_token );
$store = new Store_FS( $store_dir );

switch ( $positional_args[0] ) {
	case 'checkin' :
		$class = Endpoint\Checkin::class;
		break;
	case 'curated-list' :
	case 'list' :
		$class = Endpoint\Curated_List::class;
		break;
	case 'photo' :
		$class = Endpoint\Photo::class;
		break;
	case 'taste' :
		$class = Endpoint\Taste::class;
		break;
	case 'tip' :
		$class = Endpoint\Tip::class;
		break;
	case 'user' :
		$class = Endpoint\User::class;
		break;
	case 'venue' :
	case 'venue-visited' :
		$class = Endpoint\Venue_Visited::class;
		break;
	default :
		echo "I do not know how to fetch {$positional_args[0]}\n";
		exit( 1 );
}

$endpoint = new $class( $api, $store );

$item = $endpoint->get( $positional_args[1] );

echo json_encode( $item );
