<?php

declare(strict_types=1);

namespace MDAWaffe\Swarm;

use MDAWaffe\Swarm\API\Exception\Rate_Limit;
use MDAWaffe\Swarm\API\Store_FS;

/**
 * There's a rate limit per hour, and a rate limit per
 * UTC day.
 * If you go past the per hour limit, you'll see a
 * X-RateLimit-Reset header saying when you can retry
 * with the same access token.
 * If you go past the per day limit, you'll get a 429
 * and there will be no such header.
 */

require __DIR__ . '/api/index.php';

$all_types = [ 'users', 'checkins', 'venues-liked', 'venues-visited', 'photos', 'curated-lists', 'tips', 'tastes' ];
$lengthen_eligables = [ 'checkins', 'venues', 'curated-lists', 'tips', 'photos' ];
$push_types = [ 'checkins' => __DIR__ . '/client/checkins/pushed/' ];

$store_dir = __DIR__ . '/store';
if ( ! is_dir( $store_dir ) ) {
	if ( ! mkdir( $store_dir ) ) {
		throw new Exception( "Could not create $store_dir." );
	}
}

foreach ( [ ...$all_types, 'full', 'push' ] as $sub_dir ) {
	if ( is_dir( "$store_dir/$sub_dir" ) ) {
		continue;
	}

	if ( ! mkdir( "$store_dir/$sub_dir" ) ) {
		throw new Exception( "Could not create $store_dir/$sub_dir" );
	}
}

foreach ( $lengthen_eligables as $full_dir ) {
	if ( is_dir( "$store_dir/full/$full_dir" ) ) {
		continue;
	}

	if ( ! mkdir( "$store_dir/full/$full_dir" ) ) {
		throw new Exception( "Could not create $store_dir/full/$full_dir" );
	}
}

foreach ( $push_types as $push_dir => $link_target ) {
	if ( ! is_dir( $link_target ) ) {
		if ( ! mkdir( $link_target ) ) {
			throw new Exception( "Could not create $link_target" );
		}
	}

	if ( ! is_link( "$store_dir/push/$push_dir" ) ) {
		if ( ! symlink( $link_target, "$store_dir/push/$push_dir" ) ) {
			throw new Exception( "Could not create link $store_dir/push/$push_dir -> $link_target" );
		}
	}
}

$options = getopt(
	'',
	[
		'all-shorts', // Whether to fetch all short representations (--all-shorts) or fetch from where we left off last time (default).
		'no-overwrite-shorts', // When fetching a short representation that we already have, we normalize the old and new versions
		                       // then overwrite the old with the new if the normalized-new is different than the normalized-old.
		                       // This setting turns off that overwriting. Potentially useful for an --all-shorts sync.
		'lengthen-only', // Turns of syncing of new data. Only lengthens checkins, venues, etc. that have only a short representation and not a long representation.
		'token::', // (int) Which access token to use. 0-indexed line number of ./.access-token. Default = 0.
		'lookback::', // (int) When not doing an all-shorts fetch, number of seconds to look back from where we left off last time. Default = 1209600 (two weeks).
		'type::',
		'confirm-all-checkin-descendants', // Ensure that all venues and photos mentioned in *all* stored checkins are synced.
	]
);

$options['all-shorts'] = isset( $options['all-shorts'] );
$options['no-overwrite-shorts'] = isset( $options['no-overwrite-shorts'] );
$options['confirm-all-checkin-descendants'] = isset( $options['confirm-all-checkin-descendants'] );
$options['lengthen-only'] = isset( $options['lengthen-only'] );
$options['token'] = (int) ( $options['token'] ?? 0 );
$options['lookback'] = (int) ( $options['lookback'] ?? 60 * 60 * 24 * 7 * 2 );
if ( ! isset( $options['type'] ) ) {
	$options['type'] = $all_types;
} elseif ( false === $options['type'] ) {
	echo "ERROR: Did you mean type=something?\n";
	exit( 1 );
} else {
	$options['type'] = (array) $options['type'];
	$unknown = array_diff( $options['type'], $all_types );
	if ( $unknown ) {
		printf( "ERROR: Unknown types: %s\n", join( ', ', $unknown ) );
		exit( 1 );
	}
}

$access_token = trim( file( __DIR__ . '/.access-token' )[ $options['token'] ] );
if ( ! $access_token ) {
	echo "ERROR: No access token\n";
	exit( 1 );
}

$api = new API( $access_token );
$store = new Store_FS( $store_dir );

$user_endpoint = new Endpoint\User( $api, $store );
$taste_endpoint = new Endpoint\Taste( $api, $store );

$checkin_endpoint = new Endpoint\Checkin( $api, $store );
$venue_visited_endpoint = new Endpoint\Venue_Visited( $api, $store );
$venue_liked_endpoint = new Endpoint\Venue_Liked( $api, $store );
$curated_list_endpoint = new Endpoint\Curated_List( $api, $store );
$photo_endpoint = new Endpoint\Photo( $api, $store );
$tip_endpoint = new Endpoint\Tip( $api, $store );

$retry_later = 0;

function lengthen( $type, $extra_ids = [] ) {
	if ( 'venues' === $type ) {
		return lengthen( 'venues-liked' ) && lengthen( 'venues-visited' );
	}

	global $retry_later;

	$id_normalizer = false;
	switch ( $type ) {
		case 'checkins' :
			$endpoint = $GLOBALS['checkin_endpoint'];
			break;
		case 'curated-lists' : 
			$endpoint = $GLOBALS['curated_list_endpoint'];
			break;
		case 'tips' :
			$endpoint = $GLOBALS['tip_endpoint'];
			break;
		case 'venues-visited' :
			$endpoint = $GLOBALS['venue_visited_endpoint'];
			break;
		case 'venues-liked' :
			$id_normalizer = fn( $short_id ) => array_reverse( explode( '-', $short_id ) )[0];
			$endpoint = $GLOBALS['venue_liked_endpoint'];
			break;
		case 'photos' :
			$endpoint = $GLOBALS['photo_endpoint'];
			break;
		default :
			echo "ERROR: I do not know how to lengthen $type!\n";
			exit( 1 );
	}

	$current_shorts = $endpoint->get_all_ids();
	$current_longs = $endpoint->get_all_long_ids();

	if ( 'venues-liked' === $type ) {
		// [ short_id => long_id, ... ]
		$current_shorts = array_combine( $current_shorts, array_map( $id_normalizer, $current_shorts ) );

		$extra_ids = array_combine( $extra_ids, array_map( $id_normalizer, $extra_ids ) );
	} else {
		$current_shorts = array_combine( $current_shorts, $current_shorts );

		$extra_ids = array_combine( $extra_ids, $extra_ids );
	}

	$need_longs = array_diff( $current_shorts, $current_longs );
	$need_longs = array_merge( $need_longs, $extra_ids );

	$i = -1;
	foreach ( array_chunk( $need_longs, 100, true ) as $chunk ) {
		// [ long_id => short_item, ... ]
		$short_items = array_map( fn( $id ) => $endpoint->load( $id ), array_flip( $chunk ) );

		$new_items = [];
		try {
			// [ long_id => long_item, ... ]
			$long_items = $endpoint->lengthen( $short_items );
			foreach ( $long_items as $long_id => $long_item ) {
				$i++;
				if ( ! isset( $long_item['id'] ) ) {
					continue;
				}

				$new_items[] = $long_item;

				if ( 0 === ( $i % 100 ) ) {
					echo "\t$long_id [$i]...\n";
				}

				$endpoint->store_long( $long_id, $short_items[ $long_id ], $long_item );
			}
		} catch ( Rate_Limit $e ) {
			$retry_later = max( $retry_later, $e->retry_at );
			return false;
		} finally {
			if ( 'checkins' === $type ) {
				confirm_checkin_descendants( $new_items );
			}
		}
	}

	return true;
}

function confirm_checkin_descendants( array $checkins ) {
	global $photo_endpoint, $venue_visited_endpoint, $options;

	$confirm_photo_ids = [];
	$confirm_venue_ids = [];

	foreach ( $checkins as $checkin ) {
		if ( $checkin['photos']['count'] ) {
			foreach ( $checkin['photos']['items'] ?? [] as $photo ) {
				$confirm_photo_ids[] = sprintf( '%s-%s', $photo['createdAt'], $photo['id'] );
			}
		}

		if ( false !== strpos( $checkin['overlaps']['summary'] ?? '', 'photo' ) ) {
			foreach ( $checkin['overlaps']['items'] ?? [] as $overlap ) {
				foreach ( $overlap['photos']['items'] ?? [] as $photo ) {
					$confirm_photo_ids[] = sprintf( '%s-%s', $photo['createdAt'], $photo['id'] );
				}
			}
		}

		$confirm_venue_ids[] = $checkin['venue']['id'];
	}

	$need_photo_ids = array_diff( $confirm_photo_ids, $photo_endpoint->get_all_ids() );
	unset( $confirm_photo_ids );
	if ( $need_photo_ids ) {
		printf( "Fetching %d extra photos...\n", count( $need_photo_ids ) );
		$to_lengthen = [];
		foreach ( $need_photo_ids as $photo_id ) {
			$photo = $photo_endpoint->get( explode( '-', $photo_id )[1] );
			if ( $photo ) {
				if ( $photo_endpoint->store( $photo_id, $photo, ! $options['no-overwrite-shorts'] ) ) {
					$to_lengthen[] = $photo_id;
				}
			}
		}
		lengthen( 'photos', $to_lengthen );
	}

	$need_venue_ids = array_diff( $confirm_venue_ids, $venue_visited_endpoint->get_all_ids() );
	unset( $confirm_venue_ids );
	if ( $need_venue_ids ) {
		printf( "Fetching %d extra venues...\n", count( $need_venue_ids ) );
		$to_lengthen = [];
		foreach ( $need_venue_ids as $venue_id ) {
			$venue = $venue_visited_endpoint->get( $venue_id );
			if ( $venue ) {
				if ( $venue_visited_endpoint->store( $venue_id, $venue, ! $options['no-overwrite-shorts'] ) ) {
					$to_lengthen[] = $venue_id;
				}
			}
		}
		lengthen( 'venues-visited', $to_lengthen );
	}
}

function retry_output( $retry_at ) {
	$with_buffer = retry_at + 2 * 60;
	printf(
		"RATE LIMIT EXCEEDED: Try again after %s:\n%s",
		date( "Y-m-d H:i:s T", $with_buffer ),
		// Don't specify the date. `at` will figure it out.
		gmdate( 'H:i \\U\\T\\C', $with_buffer )
	);
	exit( 2 );
}

if ( $options['lengthen-only'] ) {
	foreach ( $lengthen_eligables as $lengthen_eligable ) {
		lengthen( $lengthen_eligable );
	}

	if ( $retry_later > 0 ) {
		retry_output( $retry_later );
	}
	echo "DONE: Lengthening.\n";
	exit;
}


$current_types = array_combine( $options['type'], $options['type'] );

$last_checkin_time = $checkin_endpoint->last_from_store();

if ( $current_types['users'] ?? null ) {
	echo "User:\n";
	$me = $user_endpoint->get( 'self' );
	$user_endpoint->store( $me['id'], $me, ! $options['no-overwrite-shorts'] );
	echo "\t{$me['handle']} {$me['id']}\n";
}


if ( $current_types['venues-visited'] ?? null ) {
	$venue_visited_options = [
		'after' => $options['all-shorts'] ? null : ( $last_checkin_time - $options['lookback'] ),
	];
	$i = -1;
	$venue_visited_id = 'no venues visited';
	echo "Venues Visited:\n";
	$to_lengthen = [];
	foreach ( $venue_visited_endpoint->iterate_short( ...$venue_visited_options ) as $venue ) {
		$i++;
		$venue_visited_id = $venue['id'];

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$venue_visited_id [$i]...\n";
		}

		if ( $venue_visited_endpoint->store( $venue_visited_id, $venue, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $venue_visited_id;
		}
	}
	echo "\t$venue_visited_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'venues-visited', $to_lengthen );
	echo "\n";
}


if ( $current_types['venues-liked'] ?? null ) {
	$last_venue_liked_time = $venue_liked_endpoint->last_from_store();
	$venue_liked_options = [
		'after' => $options['all-shorts'] ? null : ( $last_venue_liked_time - $options['lookback'] ),
	];
	$i = -1;
	$venue_liked_id = 'no venues liked';
	echo "Venues Liked:\n";
	$to_lengthen = [];
	foreach ( $venue_liked_endpoint->iterate_short( ...$venue_liked_options ) as $venue ) {
		$i++;
		$venue_liked_id = sprintf( '%s-%s', $venue['ratedAt'], $venue['id'] );

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$venue_liked_id [$i]...\n";
		}
		$i++;

		if ( $venue_liked_endpoint->store( $venue_liked_id, $venue, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $venue_liked_id;
		}
	}
	echo "\t$venue_liked_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'venues-liked', $to_lengthen );
	echo "\n";
}


if ( $current_types['photos'] ?? null ) {
	$last_photo_time = $photo_endpoint->last_from_store();
	$photo_options = [
		'after' => $options['all-shorts'] ? null : ( $last_photo_time - $options['lookback'] ),
	];
	$i = -1;
	$photo_id = 'no photos';
	echo "Photos:\n";
	$to_lengthen = [];
	foreach ( $photo_endpoint->iterate_short( ...$photo_options ) as $photo ) {
		$i++;
		$photo_id = sprintf( '%s-%s', $photo['createdAt'], $photo['id'] );

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$photo_id [$i]...\n";
		}

		if ( $photo_endpoint->store( $photo_id, $photo, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $photo_id;
		}
	}
	echo "\t$photo_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'photos', $to_lengthen );
	echo "\n";
}


if ( $current_types['checkins'] ?? null ) {
	$checkin_options = [
		'after' => $options['all-shorts'] ? null : ( $last_checkin_time - $options['lookback'] ),
	];
	$i = -1;
	$checkin_id = 'no checkins';
	echo "Checkins:\n";
	$to_lengthen = [];
	foreach ( $checkin_endpoint->iterate_short( ...$checkin_options ) as $checkin ) {
		$i++;
		$checkin_id = sprintf( '%s-%s', $checkin['createdAt'], $checkin['id'] );

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$checkin_id [$i]...\n";
		}

		if ( $checkin_endpoint->store( $checkin_id, $checkin, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $checkin_id;
		}
	}
	echo "\t$checkin_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'checkins', $to_lengthen );
	echo "\n";
}


if ( $current_types['curated-lists'] ?? null ) {
	$i = -1;
	$curated_list_id = 'no curated lists';
	echo "Curated Lists:\n";
	$to_lengthen = [];
	// Pagination doesn't work for curated lists request that do not include the `group` parameter.
	foreach ( $curated_list_endpoint->iterate_short() as $curated_list ) {
		$i++;
		$curated_list_id = $curated_list['id'];

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$curated_list_id [$i]...\n";
		}

		if ( $curated_list_endpoint->store( $curated_list_id, $curated_list, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $curated_list_id;
		}
	}
	// If there are more than 50 (what should this number be?) lists, paginate within each of the groups:
	if ( $i >= 50 ) {
		// Don't look for the items in the `yours` group. Those should have been the first ones in the previous list.
		foreach ( [ 'created', 'followed' ] as $group ) {
			foreach ( $curated_list_endpoint->iterate_short( group: $group ) as $curated_list ) {
				$curated_list_id = $curated_list['id'];

				if ( 0 === ( $i % 100 ) ) {
					echo "\t$curated_list_id [$i]...\n";
				}
				$i++;

				if ( $curated_list_endpoint->store( $curated_list_id, $curated_list, ! $options['no-overwrite-shorts'] ) ) {
					$to_lengthen[] = $curated_list_id;
				}
			}
		}
	}
	echo "\t$curated_list_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'curated-lists', array_unique( $to_lengthen ) );
	echo "\n";
}


if ( $current_types['tips'] ?? null ) {
	$last_tip_time = $tip_endpoint->last_from_store();
	$tip_options = [
		'after' => $options['all-shorts'] ? null : ( $last_tip_time - $options['lookback'] ),
	];
	$i = -1;
	$tip_id = 'no tips';
	echo "Tips:\n";
	$to_lengthen = [];
	foreach ( $tip_endpoint->iterate_short( ...$tip_options ) as $tip ) {
		$i++;
		$tip_id = sprintf( '%s-%s', $tip['createdAt'], $tip['id'] );

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$tip_id [$i]...\n";
		}

		if ( $tip_endpoint->store( $tip_id, $tip, ! $options['no-overwrite-shorts'] ) ) {
			$to_lengthen[] = $tip_id;
		}
	}
	echo "\t$tip_id [$i]\n";
	echo "\tLengthening...\n";
	lengthen( 'tips', $to_lengthen );
	echo "\n";
}


if ( $current_types['tastes'] ?? null ) {
	$i = -1;
	$taste_id = 'no tastes';
	echo "Tastes:\n";
	foreach ( $taste_endpoint->iterate_short() as $taste ) {
		$i++;
		$taste_id = $taste['id'];

		if ( 0 === ( $i % 100 ) ) {
			echo "\t$taste_id [$i]...\n";
		}

		$taste_endpoint->store( $taste_id, $taste, ! $options['no-overwrite-shorts'] );
	}
	echo "\t$taste_id [$i]\n";
	echo "\n";
}

if ( $retry_later > 0 ) {
	retry_output( $retry_later );
}

if ( $options['confirm-all-checkin-descendants'] ) {
	$checkin_long_ids = $checkin_endpoint->get_all_long_ids();
	foreach ( array_chunk( $checkin_long_ids, 100 ) as $chunk ) {
		$checkins = array_map( fn( $id ) => $checkin_endpoint->load_long( $id ), $chunk );
		confirm_checkin_descendants( $checkins );
	}
	echo "DONE: Confirming checkin descendants.\n";
}

echo "DONE: Everything is up to date.\n";
